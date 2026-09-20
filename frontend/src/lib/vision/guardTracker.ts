// ---------------------------------------------------------------------------
// Guard tracking
//
// Measures what the fighter's hands do BETWEEN and AFTER punches, which the
// previous pipeline had no concept of at all. It scored the outgoing half of
// a punch and stopped there.
//
// In boxing the return is at least as important as the throw: a fast punch
// that leaves the hand hanging is how fighters get countered. Three things
// are measured here:
//
//   * Guard recovery   — did the hand come back, and how quickly?
//   * Guard integrity  — did the OPPOSITE hand drop while punching? (the
//                        single most common amateur fault, and completely
//                        invisible to a system that only watches the
//                        punching arm)
//   * Wrist alignment  — is the fist in line with the forearm at impact, or
//                        collapsed? Only measurable with hand landmarks.
//
// Everything is normalized by shoulder width so it's scale/distance
// invariant, matching the convention used elsewhere in the pipeline.
// ---------------------------------------------------------------------------

import { Vec3, angle3D } from './kinematics';

export interface GuardBaseline {
  /** Resting wrist position per side, normalized to shoulder-relative space. */
  left: { x: number; y: number } | null;
  right: { x: number; y: number } | null;
  established: boolean;
}

export interface GuardSnapshot {
  /** 0-100: how close the non-punching hand stayed to its guard position. */
  integrityScore: number;
  /** Normalized distance the off-hand drifted from guard. */
  offHandDrift: number;
  /** True when the off-hand dropped significantly below guard height. */
  offHandDropped: boolean;
}

export interface RecoveryResult {
  /** 0-100: how fully the hand returned to guard. */
  returnScore: number;
  /** ms from peak extension back to guard, or null if it never returned. */
  recoveryMs: number | null;
  /** True if the hand never came back within the observation window. */
  abandoned: boolean;
}

/**
 * Hand landmark indices (MediaPipe HandLandmarker, 21-point topology).
 * Only the few needed for wrist alignment are named.
 */
export const HAND_LM = {
  WRIST: 0,
  INDEX_MCP: 5,   // knuckle of the index finger
  MIDDLE_MCP: 9,  // knuckle of the middle finger — the "punching knuckle" line
  PINKY_MCP: 17,
} as const;

/**
 * A correctly aligned fist keeps the forearm->wrist->knuckle line close to
 * straight. Below this angle the wrist has visibly collapsed, which is both
 * a power leak and the most common way amateurs injure themselves.
 */
const WRIST_ALIGNED_DEG = 160;
const WRIST_COLLAPSED_DEG = 130;

/** Off-hand drift (in shoulder widths) treated as a fully dropped guard. */
const FULL_GUARD_DROP = 0.45;

/** Hand must come back within this fraction of its original guard distance. */
const RECOVERY_THRESHOLD = 0.3;

/** Window after peak extension in which a return still counts. */
const RECOVERY_WINDOW_MS = 900;

export class GuardTracker {
  private baseline: GuardBaseline = { left: null, right: null, established: false };

  /** EMA factor for the resting-guard baseline while genuinely at rest. */
  private readonly alpha = 0.06;

  reset(): void {
    this.baseline = { left: null, right: null, established: false };
  }

  get isEstablished(): boolean {
    return this.baseline.established;
  }

  get current(): GuardBaseline {
    return this.baseline;
  }

  /**
   * Update the resting guard baseline. Call ONLY while the fighter is
   * genuinely at rest (the caller already computes this as `atRest`), or
   * the baseline drifts toward the extended position and every recovery
   * measurement collapses toward a meaningless 100.
   */
  updateBaseline(
    leftWrist: { x: number; y: number } | null,
    rightWrist: { x: number; y: number } | null,
    shoulderMid: { x: number; y: number },
    shoulderWidth: number
  ): void {
    if (shoulderWidth <= 1e-6) return;

    const norm = (p: { x: number; y: number }) => ({
      x: (p.x - shoulderMid.x) / shoulderWidth,
      y: (p.y - shoulderMid.y) / shoulderWidth,
    });

    if (leftWrist) {
      const n = norm(leftWrist);
      this.baseline.left = this.baseline.left
        ? {
            x: this.baseline.left.x * (1 - this.alpha) + n.x * this.alpha,
            y: this.baseline.left.y * (1 - this.alpha) + n.y * this.alpha,
          }
        : n;
    }
    if (rightWrist) {
      const n = norm(rightWrist);
      this.baseline.right = this.baseline.right
        ? {
            x: this.baseline.right.x * (1 - this.alpha) + n.x * this.alpha,
            y: this.baseline.right.y * (1 - this.alpha) + n.y * this.alpha,
          }
        : n;
    }
    this.baseline.established = !!(this.baseline.left && this.baseline.right);
  }

  /**
   * How far a given hand currently sits from its guard baseline, in
   * shoulder widths. Returns null when no baseline exists yet.
   */
  driftFromGuard(
    side: 'left' | 'right',
    wrist: { x: number; y: number } | null,
    shoulderMid: { x: number; y: number },
    shoulderWidth: number
  ): number | null {
    const base = side === 'left' ? this.baseline.left : this.baseline.right;
    if (!base || !wrist || shoulderWidth <= 1e-6) return null;
    const nx = (wrist.x - shoulderMid.x) / shoulderWidth;
    const ny = (wrist.y - shoulderMid.y) / shoulderWidth;
    return Math.hypot(nx - base.x, ny - base.y);
  }

  /**
   * Score the NON-punching hand during a strike. This is the guard-integrity
   * measurement — "does your other hand drop when you punch".
   */
  evaluateOffHand(
    punchingSide: 'left' | 'right',
    offWrist: { x: number; y: number } | null,
    shoulderMid: { x: number; y: number },
    shoulderWidth: number
  ): GuardSnapshot | null {
    const offSide = punchingSide === 'left' ? 'right' : 'left';
    const drift = this.driftFromGuard(offSide, offWrist, shoulderMid, shoulderWidth);
    if (drift === null) return null;

    const base = offSide === 'left' ? this.baseline.left : this.baseline.right;
    // In normalized image space y grows downward, so a hand that is LOWER
    // than its guard baseline has a larger y.
    const droppedBelow =
      !!base && !!offWrist
        ? (offWrist.y - shoulderMid.y) / shoulderWidth - base.y > 0.2
        : false;

    return {
      integrityScore: Math.round(
        Math.min(100, Math.max(0, 100 - (drift / FULL_GUARD_DROP) * 100))
      ),
      offHandDrift: drift,
      offHandDropped: droppedBelow,
    };
  }

  /**
   * Score how fully a punching hand returned to guard.
   *
   * `peakDrift` is the drift at full extension; `driftSamples` are
   * (timestamp, drift) readings taken after that peak.
   */
  evaluateRecovery(
    peakDrift: number,
    peakAtMs: number,
    driftSamples: Array<{ t: number; drift: number }>
  ): RecoveryResult {
    if (peakDrift <= 1e-6 || driftSamples.length === 0) {
      return { returnScore: 0, recoveryMs: null, abandoned: true };
    }

    const target = peakDrift * RECOVERY_THRESHOLD;
    let recoveredAt: number | null = null;
    let closestDrift = peakDrift;

    for (const sample of driftSamples) {
      if (sample.t < peakAtMs) continue;
      if (sample.t - peakAtMs > RECOVERY_WINDOW_MS) break;
      if (sample.drift < closestDrift) closestDrift = sample.drift;
      if (sample.drift <= target && recoveredAt === null) {
        recoveredAt = sample.t;
        break;
      }
    }

    if (recoveredAt !== null) {
      const recoveryMs = Math.round(recoveredAt - peakAtMs);
      // Faster return scores higher. 150ms is a genuinely sharp retraction;
      // 700ms is a hand being lazily lowered rather than snapped back.
      const speedScore = Math.min(
        100,
        Math.max(0, ((700 - recoveryMs) / (700 - 150)) * 100)
      );
      return { returnScore: Math.round(speedScore), recoveryMs, abandoned: false };
    }

    // Never reached guard: score purely on how far back it got.
    const partial = Math.min(
      100,
      Math.max(0, ((peakDrift - closestDrift) / (peakDrift - target)) * 100)
    );
    return { returnScore: Math.round(partial * 0.5), recoveryMs: null, abandoned: true };
  }
}

// ---------------------------------------------------------------------------
// Wrist alignment (requires hand landmarks)
// ---------------------------------------------------------------------------

export interface WristAlignment {
  /** Forearm -> wrist -> knuckle angle, degrees. 180 = perfectly straight. */
  angleDeg: number;
  /** 0-100. */
  score: number;
  collapsed: boolean;
}

/**
 * Measure wrist alignment at impact from the elbow (pose), the hand's wrist
 * point and its middle knuckle (hand model).
 *
 * Returns null when hand tracking isn't available, which the caller must
 * treat as "not measured" rather than "bad" — exactly the confidence
 * distinction the rest of the pipeline now enforces.
 */
export function measureWristAlignment(
  elbow: Vec3 | null,
  handWrist: Vec3 | null,
  middleKnuckle: Vec3 | null
): WristAlignment | null {
  if (!elbow || !handWrist || !middleKnuckle) return null;
  const angle = angle3D(elbow, handWrist, middleKnuckle);
  if (angle === null) return null;

  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        ((angle - WRIST_COLLAPSED_DEG) / (WRIST_ALIGNED_DEG - WRIST_COLLAPSED_DEG)) * 100
      )
    )
  );

  return { angleDeg: Math.round(angle), score, collapsed: angle < WRIST_COLLAPSED_DEG };
}

/**
 * Pick the hand that belongs to a given body side.
 *
 * MediaPipe reports handedness in IMAGE space on a mirrored selfie view, so
 * its "Left" is the fighter's right hand. Matching by proximity to the
 * pose wrist instead of trusting the label avoids that whole class of
 * mirror bug, which is notoriously easy to get backwards.
 */
export function matchHandToWrist(
  hands: Array<{ landmarks: Array<{ x: number; y: number; z?: number }> }>,
  poseWrist: { x: number; y: number } | null,
  maxDistance = 0.15
): Array<{ x: number; y: number; z?: number }> | null {
  if (!poseWrist || hands.length === 0) return null;
  let best: Array<{ x: number; y: number; z?: number }> | null = null;
  let bestDist = Infinity;
  for (const hand of hands) {
    const hw = hand.landmarks?.[HAND_LM.WRIST];
    if (!hw) continue;
    const d = Math.hypot(hw.x - poseWrist.x, hw.y - poseWrist.y);
    if (d < bestDist) {
      bestDist = d;
      best = hand.landmarks;
    }
  }
  return bestDist <= maxDistance ? best : null;
}
