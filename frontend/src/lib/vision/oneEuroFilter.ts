// ---------------------------------------------------------------------------
// One Euro Filter
//
// Adaptive low-pass filter for noisy real-time signals (Casiez, Roussel &
// Vogel, CHI 2012). The reason this is the right filter for pose landmarks
// rather than a plain EMA:
//
//   * A fixed-alpha EMA has ONE tradeoff setting. Set alpha low and you kill
//     jitter but the skeleton visibly lags the arm on a fast punch; set it
//     high and fast motion tracks well but the fighter's "at rest" guard
//     position shivers, which corrupts every baseline measured off it
//     (rotation, weight transfer, wrist displacement...).
//   * One Euro varies its cutoff with the signal's own speed: slow motion
//     gets heavy smoothing (jitter dies), fast motion gets almost none (no
//     added latency). That is exactly the pose-estimation problem.
//
// This is why vision/page.tsx could previously only afford to smooth the
// elbow angle (SMOOTHING_ALPHA) and had to leave hips/shoulders/feet/wrists
// completely raw — a fixed EMA on those would have added lag to the very
// signals that need to be responsive. One Euro lets every landmark be
// filtered without that penalty.
//
// No external dependency: the whole algorithm is ~40 lines of arithmetic,
// so vendoring it is strictly cheaper than an npm package.
// ---------------------------------------------------------------------------

/** Standard exponential smoothing step with an explicit alpha. */
function exponentialSmooth(alpha: number, value: number, previous: number): number {
  return alpha * value + (1 - alpha) * previous;
}

/**
 * Convert a cutoff frequency (Hz) + sample period (s) into a smoothing
 * alpha. Higher cutoff => higher alpha => less smoothing / more
 * responsiveness.
 */
function alphaFor(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

export interface OneEuroOptions {
  /**
   * Cutoff frequency at zero speed, in Hz. LOWER = steadier when still.
   * This is the main knob for killing resting jitter.
   */
  minCutoff?: number;
  /**
   * Speed coefficient. HIGHER = the filter opens up more aggressively as
   * the signal speeds up, i.e. less lag on fast motion. This is the main
   * knob for punch responsiveness.
   */
  beta?: number;
  /** Cutoff used to smooth the derivative estimate itself, in Hz. */
  derivativeCutoff?: number;
}

// NOTE ON BETA SCALE: beta is multiplied by the signal's speed in the
// signal's OWN units. These filters run on normalized image coordinates
// (frame = 1.0), where a wrist at punch speed moves roughly 1-4 units/sec.
// So beta must be O(1-10) here to meaningfully raise the cutoff during a
// punch. An earlier revision used beta ~0.007, which moved the effective
// smoothing factor from 0.263 (at rest) only as far as 0.279 (at full
// punch speed) — i.e. the filter never adapted at all and behaved as a
// plain fixed EMA, which is exactly what One Euro exists to avoid. If
// these filters are ever reused on pixel-unit data, beta must be scaled
// down by the frame dimension accordingly.
const DEFAULTS: Required<OneEuroOptions> = {
  minCutoff: 1.0,
  beta: 2.0,
  derivativeCutoff: 1.0,
};

/** One Euro filter over a single scalar channel. */
export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly derivativeCutoff: number;

  private lastValue: number | null = null;
  private lastFiltered: number | null = null;
  private lastDerivative = 0;
  private lastTimestampMs: number | null = null;

  constructor(options: OneEuroOptions = {}) {
    const merged = { ...DEFAULTS, ...options };
    this.minCutoff = merged.minCutoff;
    this.beta = merged.beta;
    this.derivativeCutoff = merged.derivativeCutoff;
  }

  /** Current filtered value, or null if nothing has been fed in yet. */
  get value(): number | null {
    return this.lastFiltered;
  }

  reset(): void {
    this.lastValue = null;
    this.lastFiltered = null;
    this.lastDerivative = 0;
    this.lastTimestampMs = null;
  }

  /**
   * Feed one sample. `timestampMs` should be a monotonic clock
   * (performance.now()); dt is derived from it, so variable frame rates
   * are handled correctly rather than assuming a fixed 30/60fps.
   */
  filter(value: number, timestampMs: number): number {
    if (!Number.isFinite(value)) {
      // Never let a NaN/Infinity poison the filter state — hold the last
      // good value instead. A single corrupt landmark frame otherwise
      // makes every subsequent sample NaN forever.
      return this.lastFiltered ?? 0;
    }

    if (this.lastFiltered === null || this.lastTimestampMs === null) {
      this.lastValue = value;
      this.lastFiltered = value;
      this.lastDerivative = 0;
      this.lastTimestampMs = timestampMs;
      return value;
    }

    // Guard against zero/negative/absurd dt (tab throttling, timer
    // coalescing, a paused-then-resumed loop) — clamp into a sane band so
    // alphaFor() can't divide by zero or produce a degenerate alpha.
    const rawDt = (timestampMs - this.lastTimestampMs) / 1000;
    const dt = Math.min(Math.max(rawDt, 1 / 240), 1 / 5);

    const rawDerivative = (value - (this.lastValue as number)) / dt;
    const derivative = exponentialSmooth(
      alphaFor(this.derivativeCutoff, dt),
      rawDerivative,
      this.lastDerivative
    );

    // The adaptive part: cutoff rises with |speed|, so fast motion is
    // barely filtered while slow motion is filtered hard.
    const cutoff = this.minCutoff + this.beta * Math.abs(derivative);
    const filtered = exponentialSmooth(alphaFor(cutoff, dt), value, this.lastFiltered);

    this.lastValue = value;
    this.lastDerivative = derivative;
    this.lastFiltered = filtered;
    this.lastTimestampMs = timestampMs;
    return filtered;
  }
}

/**
 * One Euro over a 3D point, filtering each axis on its own filter instance.
 * Pose landmarks are 3-channel, so this is the shape actually used by the
 * landmark filter; z is optional because the legacy pose path doesn't
 * always populate it.
 */
export class OneEuroPointFilter {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;
  private readonly fz: OneEuroFilter;

  constructor(options: OneEuroOptions = {}) {
    this.fx = new OneEuroFilter(options);
    this.fy = new OneEuroFilter(options);
    this.fz = new OneEuroFilter(options);
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }

  filter(
    point: { x: number; y: number; z?: number },
    timestampMs: number
  ): { x: number; y: number; z: number } {
    return {
      x: this.fx.filter(point.x, timestampMs),
      y: this.fy.filter(point.y, timestampMs),
      z: this.fz.filter(point.z ?? 0, timestampMs),
    };
  }
}
