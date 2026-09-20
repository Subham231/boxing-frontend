// ---------------------------------------------------------------------------
// Landmark stream conditioning
//
// Sits between the raw pose model output and every measurement the app makes.
// Responsibilities, in order of application per landmark per frame:
//
//   1. Visibility gating      — is this point trustworthy at all this frame?
//   2. Teleport rejection     — did it "snap" somewhere physically impossible?
//   3. Occlusion prediction   — if it just dropped out, coast on last velocity
//                               instead of letting the measurement collapse.
//   4. One Euro smoothing     — kill jitter without adding lag to fast motion.
//
// Why this exists: boxing is close to the worst case for monocular pose
// estimation. Hands cross in front of the face and torso constantly, so
// wrists/elbows drop out and snap back several times per combination. The
// previous behaviour was to simply skip a measurement when
// `visibility <= 0.4`, which meant a punch whose wrist occluded at the exact
// moment of peak extension scored its biomechanics off whatever stale or
// partial data survived. Coasting through a short occlusion on the last
// known velocity is both more accurate and more stable than either
// accepting a garbage landmark or dropping the rep.
// ---------------------------------------------------------------------------

import { OneEuroPointFilter, OneEuroOptions } from './oneEuroFilter';

export interface RawLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface FilteredLandmark {
  x: number;
  y: number;
  z: number;
  /** Model-reported visibility for this frame (0 when the point was absent). */
  visibility: number;
  /**
   * How much to trust this specific reading, 0-1. Distinct from
   * `visibility`: a point can be reported visible but still be low
   * confidence because it was just predicted through an occlusion or it
   * just teleported. This is what propagates into per-rep confidence.
   */
  confidence: number;
  /** True when this position was extrapolated rather than measured. */
  predicted: boolean;
}

/** Below this, a landmark is treated as not genuinely observed this frame. */
export const VISIBILITY_FLOOR = 0.4;

/**
 * Max plausible per-second travel for a landmark, in normalized image units
 * (frame height = 1). A fast punch moves a wrist roughly 0.6-1.2 units/sec
 * on a 640x480 webcam framing; 6.0 is far above anything anatomically real,
 * so anything past it is a tracker snap (usually left/right limb swap, or
 * the model latching onto a background object), not motion.
 */
const MAX_PLAUSIBLE_SPEED = 6.0;

/**
 * How long a landmark may be coasted through an occlusion before we stop
 * pretending we know where it is. Past this, confidence goes to 0 and the
 * consumer should exclude it rather than trust a long extrapolation.
 */
const MAX_PREDICTION_MS = 220;

/** Per-landmark filter + motion state. */
interface LandmarkState {
  filter: OneEuroPointFilter;
  lastGood: { x: number; y: number; z: number } | null;
  lastGoodTs: number | null;
  velocity: { x: number; y: number; z: number };
  predictedForMs: number;
}

export interface FrameQuality {
  /** Mean confidence across the landmarks this session actually cares about. */
  meanConfidence: number;
  /** Fraction of tracked landmarks genuinely observed (not predicted). */
  observedRatio: number;
  /** Count of landmarks currently being coasted through occlusion. */
  occludedCount: number;
  /** Count of landmarks whose reading was rejected as a teleport this frame. */
  rejectedCount: number;
}

export interface FilterResult {
  landmarks: FilteredLandmark[];
  quality: FrameQuality;
}

/**
 * Tuning profiles. Different body parts want genuinely different tradeoffs:
 * a wrist during a punch is the fastest thing in frame and must not lag, a
 * hip is nearly static and benefits from heavy smoothing since every
 * rotation/weight-transfer baseline is measured off it.
 */
// beta is in units of "cutoff Hz per unit of normalized speed" — see the
// scale note in oneEuroFilter.ts. Verified numerically: FAST moves the
// smoothing factor from ~0.21 at rest to ~0.77 at punch speed, which is
// the adaptive behaviour this filter is chosen for.
const FAST_PROFILE: OneEuroOptions = { minCutoff: 1.2, beta: 5.0, derivativeCutoff: 1.0 };
const MEDIUM_PROFILE: OneEuroOptions = { minCutoff: 0.9, beta: 2.0, derivativeCutoff: 1.0 };
const STABLE_PROFILE: OneEuroOptions = { minCutoff: 0.5, beta: 0.8, derivativeCutoff: 1.0 };

/** BlazePose indices, duplicated here so this module stays self-contained. */
const FAST_LANDMARKS = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]); // elbows, wrists, hands
const STABLE_LANDMARKS = new Set([23, 24, 25, 26, 27, 28, 29, 30, 31, 32]); // hips, knees, ankles, feet

function profileFor(index: number): OneEuroOptions {
  if (FAST_LANDMARKS.has(index)) return FAST_PROFILE;
  if (STABLE_LANDMARKS.has(index)) return STABLE_PROFILE;
  return MEDIUM_PROFILE;
}

export class LandmarkFilter {
  private states = new Map<number, LandmarkState>();

  /** Landmarks whose confidence feeds the frame-quality summary. */
  private readonly trackedIndices: number[];

  constructor(trackedIndices: number[]) {
    this.trackedIndices = trackedIndices;
  }

  reset(): void {
    this.states.clear();
  }

  private stateFor(index: number): LandmarkState {
    let state = this.states.get(index);
    if (!state) {
      state = {
        filter: new OneEuroPointFilter(profileFor(index)),
        lastGood: null,
        lastGoodTs: null,
        velocity: { x: 0, y: 0, z: 0 },
        predictedForMs: 0,
      };
      this.states.set(index, state);
    }
    return state;
  }

  /**
   * Condition a full frame of landmarks.
   *
   * `raw` is the model's output array; missing/undefined entries are
   * handled (they occur when a model returns a short array or the caller
   * passes a sparse one).
   */
  process(raw: (RawLandmark | undefined)[], timestampMs: number): FilterResult {
    const out: FilteredLandmark[] = [];
    let rejectedCount = 0;
    let occludedCount = 0;

    for (let i = 0; i < raw.length; i++) {
      const point = raw[i];
      const state = this.stateFor(i);
      const visibility = point?.visibility ?? (point ? 1 : 0);

      const observed = !!point && visibility >= VISIBILITY_FLOOR &&
        Number.isFinite(point.x) && Number.isFinite(point.y);

      if (observed && point) {
        // --- Teleport rejection -------------------------------------------
        // Compare against the last accepted position at real elapsed time.
        let teleported = false;
        if (state.lastGood && state.lastGoodTs !== null) {
          const dtSec = Math.max((timestampMs - state.lastGoodTs) / 1000, 1 / 240);
          const dist = Math.hypot(point.x - state.lastGood.x, point.y - state.lastGood.y);
          if (dist / dtSec > MAX_PLAUSIBLE_SPEED) teleported = true;
        }

        if (teleported) {
          rejectedCount++;
          out.push(this.predict(i, state, timestampMs, visibility));
          continue;
        }

        // --- Accept, smooth, and update velocity --------------------------
        const smoothed = state.filter.filter(point, timestampMs);

        if (state.lastGood && state.lastGoodTs !== null) {
          const dtSec = Math.max((timestampMs - state.lastGoodTs) / 1000, 1 / 240);
          state.velocity = {
            x: (smoothed.x - state.lastGood.x) / dtSec,
            y: (smoothed.y - state.lastGood.y) / dtSec,
            z: (smoothed.z - state.lastGood.z) / dtSec,
          };
        }
        state.lastGood = smoothed;
        state.lastGoodTs = timestampMs;
        state.predictedForMs = 0;

        // Confidence tracks the model's own visibility once the reading has
        // passed our sanity checks — no invented certainty.
        out.push({
          x: smoothed.x,
          y: smoothed.y,
          z: smoothed.z,
          visibility,
          confidence: Math.min(1, visibility),
          predicted: false,
        });
        continue;
      }

      // --- Not observed: coast on last velocity ---------------------------
      occludedCount++;
      out.push(this.predict(i, state, timestampMs, visibility));
    }

    // Frame quality is summarised over the landmarks this app measures from,
    // not all 33 — face/finger points dropping out is irrelevant to whether
    // a punch can be scored.
    let confSum = 0;
    let observedSum = 0;
    let counted = 0;
    for (const idx of this.trackedIndices) {
      const lm = out[idx];
      if (!lm) continue;
      confSum += lm.confidence;
      observedSum += lm.predicted ? 0 : 1;
      counted++;
    }

    return {
      landmarks: out,
      quality: {
        meanConfidence: counted ? confSum / counted : 0,
        observedRatio: counted ? observedSum / counted : 0,
        occludedCount,
        rejectedCount,
      },
    };
  }

  /**
   * Extrapolate an occluded/rejected landmark from its last known position
   * and velocity, with confidence decaying to zero over MAX_PREDICTION_MS.
   */
  private predict(
    index: number,
    state: LandmarkState,
    timestampMs: number,
    visibility: number
  ): FilteredLandmark {
    if (!state.lastGood || state.lastGoodTs === null) {
      // Never had a good reading for this point — nothing to predict from.
      return { x: 0, y: 0, z: 0, visibility, confidence: 0, predicted: true };
    }

    const elapsedMs = timestampMs - state.lastGoodTs;
    state.predictedForMs = elapsedMs;

    if (elapsedMs > MAX_PREDICTION_MS) {
      // Too long gone to guess. Hold the last position so geometry stays
      // well-formed, but report zero confidence so consumers exclude it.
      return {
        x: state.lastGood.x,
        y: state.lastGood.y,
        z: state.lastGood.z,
        visibility,
        confidence: 0,
        predicted: true,
      };
    }

    const dtSec = elapsedMs / 1000;
    // Damp the extrapolation: a limb decelerates during an occlusion far
    // more often than it keeps accelerating, so projecting full velocity
    // overshoots badly. Half-velocity is a deliberate underestimate.
    const damping = 0.5;
    const decay = 1 - elapsedMs / MAX_PREDICTION_MS;

    return {
      x: state.lastGood.x + state.velocity.x * dtSec * damping,
      y: state.lastGood.y + state.velocity.y * dtSec * damping,
      z: state.lastGood.z + state.velocity.z * dtSec * damping,
      visibility,
      confidence: Math.max(0, decay) * 0.5, // predicted data is never full confidence
      predicted: true,
    };
  }
}
