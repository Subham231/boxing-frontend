// ---------------------------------------------------------------------------
// Kinematics
//
// Three capabilities the previous pipeline didn't have:
//
//  1. TRUE 3D JOINT ANGLES. Every angle was previously computed from
//     normalized image coordinates (x,y only). That measurement is
//     projection-dependent: the setup guide asks the fighter to stand at
//     roughly 45 degrees to the camera, and at that angle a fully extended
//     arm pointing partly toward the lens projects to a SHORT, BENT-looking
//     segment in the image plane. So a perfect cross could read as ~140
//     degrees of elbow extension and never cross ELBOW_EXTEND_THRESHOLD,
//     while a sloppier square-on jab cleared it easily. World landmarks are
//     metric 3D relative to the hip midpoint, so the same angle reads the
//     same regardless of where the fighter stands. This is the single
//     largest accuracy improvement available in the whole pipeline.
//
//  2. DERIVATIVES AS FIRST-CLASS SIGNALS. Peak velocity alone doesn't
//     describe a punch — time-to-peak, peak acceleration, and retraction
//     speed distinguish an explosive snap from a slow push that eventually
//     reaches the same top speed.
//
//  3. KINETIC-CHAIN SEQUENCING. A correct cross fires hip -> torso ->
//     shoulder -> elbow -> wrist in that order. Recording WHEN each segment
//     peaks lets the coaching layer say "arm-dominant punch, lower body
//     never initiated" instead of the much less actionable "hip rotation
//     score is low".
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Angle math
// ---------------------------------------------------------------------------

/**
 * Interior angle ABC in degrees, in full 3D. Returns null when any segment
 * is degenerate (coincident points), so callers can distinguish "couldn't
 * measure" from a real 0-degree reading — the old 2D helper returned 0 for
 * both, which silently fed zeros into scoring.
 */
export function angle3D(a: Vec3, b: Vec3, c: Vec3): number | null {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const magAB = Math.hypot(ab.x, ab.y, ab.z);
  const magCB = Math.hypot(cb.x, cb.y, cb.z);
  if (magAB < 1e-6 || magCB < 1e-6) return null;
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const cos = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 2D fallback for when world landmarks aren't available (legacy backend). */
export function angle2D(a: Point2D, b: Point2D, c: Point2D): number | null {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB < 1e-6 || magCB < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (ab.x * cb.x + ab.y * cb.y) / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Rotation of a body line (shoulders or hips) about the vertical axis, in
 * degrees, measured in the horizontal plane from world landmarks.
 *
 * The old implementation used atan2 of the 2D image-space line, which
 * conflates real axial rotation with the fighter simply leaning or the
 * camera being off-axis. Using the x/z (horizontal) plane of the world
 * landmarks measures the rotation people actually mean by "turning the
 * hips over".
 */
export function axialRotationDeg(left: Vec3, right: Vec3): number {
  const dx = right.x - left.x;
  const dz = right.z - left.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  return (Math.atan2(dz, dx) * 180) / Math.PI;
}

/** Smallest signed difference between two angles, in degrees (-180..180]. */
export function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function distance3D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ---------------------------------------------------------------------------
// Derivative tracking
// ---------------------------------------------------------------------------

export interface SignalSample {
  value: number;
  velocity: number;
  acceleration: number;
  timestampMs: number;
}

/**
 * Tracks a scalar signal's value, first and second derivatives, plus the
 * peaks of each and WHEN they occurred.
 *
 * Timestamps are the point of this class: `peakVelocityAt` is what makes
 * kinetic-chain sequencing measurable. Without it you can only say how much
 * each segment rotated, never in what order they fired.
 */
export class SignalTracker {
  private last: SignalSample | null = null;

  peakValue = 0;
  peakValueAt = 0;
  minValue = Number.POSITIVE_INFINITY;
  peakVelocity = 0;
  peakVelocityAt = 0;
  peakAcceleration = 0;
  peakAccelerationAt = 0;
  /** Most negative velocity seen — the retraction/return phase. */
  peakNegativeVelocity = 0;
  peakNegativeVelocityAt = 0;

  private samples: SignalSample[] = [];
  private readonly historyLimit: number;

  constructor(historyLimit = 120) {
    this.historyLimit = historyLimit;
  }

  reset(): void {
    this.last = null;
    this.samples = [];
    this.peakValue = 0;
    this.peakValueAt = 0;
    this.minValue = Number.POSITIVE_INFINITY;
    this.peakVelocity = 0;
    this.peakVelocityAt = 0;
    this.peakAcceleration = 0;
    this.peakAccelerationAt = 0;
    this.peakNegativeVelocity = 0;
    this.peakNegativeVelocityAt = 0;
  }

  /**
   * `maxPlausibleVelocity` rejects derivative spikes caused by a landmark
   * snapping rather than real motion. Without it, one bad frame sets
   * peakVelocity for the whole rep.
   */
  push(value: number, timestampMs: number, maxPlausibleVelocity = Infinity): SignalSample {
    if (!Number.isFinite(value)) {
      return this.last ?? { value: 0, velocity: 0, acceleration: 0, timestampMs };
    }

    let velocity = 0;
    let acceleration = 0;

    if (this.last) {
      const dt = (timestampMs - this.last.timestampMs) / 1000;
      if (dt > 1e-4) {
        velocity = (value - this.last.value) / dt;
        if (Math.abs(velocity) > maxPlausibleVelocity) {
          // Implausible jump: keep the previous derivative rather than
          // letting a tracker glitch define the rep's peak.
          velocity = this.last.velocity;
        }
        acceleration = (velocity - this.last.velocity) / dt;
      } else {
        velocity = this.last.velocity;
        acceleration = this.last.acceleration;
      }
    }

    const sample: SignalSample = { value, velocity, acceleration, timestampMs };

    if (value > this.peakValue) {
      this.peakValue = value;
      this.peakValueAt = timestampMs;
    }
    if (value < this.minValue) this.minValue = value;
    if (velocity > this.peakVelocity) {
      this.peakVelocity = velocity;
      this.peakVelocityAt = timestampMs;
    }
    if (velocity < this.peakNegativeVelocity) {
      this.peakNegativeVelocity = velocity;
      this.peakNegativeVelocityAt = timestampMs;
    }
    if (Math.abs(acceleration) > Math.abs(this.peakAcceleration)) {
      this.peakAcceleration = acceleration;
      this.peakAccelerationAt = timestampMs;
    }

    this.samples.push(sample);
    if (this.samples.length > this.historyLimit) this.samples.shift();
    this.last = sample;
    return sample;
  }

  get current(): SignalSample | null {
    return this.last;
  }

  get history(): readonly SignalSample[] {
    return this.samples;
  }
}

// ---------------------------------------------------------------------------
// Kinetic chain sequencing
// ---------------------------------------------------------------------------

/** Segments of the chain, in the order a correct punch should fire them. */
export const CHAIN_ORDER = ['hip', 'torso', 'shoulder', 'elbow', 'wrist'] as const;
export type ChainSegment = (typeof CHAIN_ORDER)[number];

export interface SequencingResult {
  /** Peak-velocity timestamp per segment, relative to the first, in ms. */
  offsetsMs: Partial<Record<ChainSegment, number>>;
  /**
   * 0-100. How well the observed firing order matches proximal-to-distal.
   * 100 = textbook hip-first sequence; 0 = fully reversed (arm-dominant).
   */
  sequenceScore: number;
  /**
   * True when the arm segments peaked before the lower body did — the
   * classic "arm punch" with no kinetic chain behind it.
   */
  armDominant: boolean;
  /** Total time from first segment peak to last, in ms. */
  chainDurationMs: number;
  /** Segments that had a usable signal. Fewer than 3 => low confidence. */
  measuredSegments: number;
}

/**
 * Score how closely the observed peak order matches the ideal
 * proximal-to-distal order, using pairwise concordance (Kendall-tau style).
 *
 * Pairwise rather than "is the exact permutation right" because near-ties
 * are normal and shouldn't be punished: hip and torso peaking 8ms apart in
 * either order is the same punch, whereas wrist peaking 150ms before hip is
 * a genuinely different (and worse) movement.
 */
export function analyzeSequencing(
  peakTimes: Partial<Record<ChainSegment, number>>
): SequencingResult {
  const present = CHAIN_ORDER.filter(
    (s) => typeof peakTimes[s] === 'number' && Number.isFinite(peakTimes[s] as number)
  );

  if (present.length < 2) {
    return {
      offsetsMs: {},
      sequenceScore: 0,
      armDominant: false,
      chainDurationMs: 0,
      measuredSegments: present.length,
    };
  }

  const times = present.map((s) => peakTimes[s] as number);
  const earliest = Math.min(...times);
  const latest = Math.max(...times);

  const offsetsMs: Partial<Record<ChainSegment, number>> = {};
  for (const s of present) {
    offsetsMs[s] = Math.round((peakTimes[s] as number) - earliest);
  }

  // Pairwise concordance with the ideal order.
  let concordant = 0;
  let total = 0;
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      total++;
      const tEarlier = peakTimes[present[i]] as number;
      const tLater = peakTimes[present[j]] as number;
      // present[] preserves CHAIN_ORDER, so i is always the more proximal
      // segment — a correct punch has it peaking no later than j.
      if (tEarlier <= tLater) concordant++;
    }
  }
  const sequenceScore = total ? Math.round((concordant / total) * 100) : 0;

  // Arm dominance: the distal segments led the proximal ones.
  const hipT = peakTimes.hip;
  const torsoT = peakTimes.torso;
  const elbowT = peakTimes.elbow;
  const wristT = peakTimes.wrist;
  const lowerBody = [hipT, torsoT].filter((t): t is number => typeof t === 'number');
  const upperBody = [elbowT, wristT].filter((t): t is number => typeof t === 'number');
  const armDominant =
    lowerBody.length > 0 &&
    upperBody.length > 0 &&
    Math.min(...upperBody) < Math.min(...lowerBody) - 20; // 20ms deadband for near-ties

  return {
    offsetsMs,
    sequenceScore,
    armDominant,
    chainDurationMs: Math.round(latest - earliest),
    measuredSegments: present.length,
  };
}

// ---------------------------------------------------------------------------
// Statistics used by the consistency layer
// ---------------------------------------------------------------------------

export interface Stats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  /** 0-100; 100 = perfectly repeatable. */
  consistency: number;
  count: number;
}

/**
 * `consistencyReference` is the stdDev treated as "maximally inconsistent".
 * For 0-100 scores, 35 matches the scale already used elsewhere in the app.
 */
export function computeStats(values: number[], consistencyReference = 35): Stats {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, consistency: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.round(
    Math.min(100, Math.max(0, 100 - (stdDev / consistencyReference) * 100))
  );
  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    consistency,
    count: values.length,
  };
}
