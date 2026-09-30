// ---------------------------------------------------------------------------
// Rep grading — lenient by design.
//
// Pure functions, no React. Three rules drive everything here:
//   1. Bad tracking is never the fighter's fault: a rep we can't verify is
//      "unverified" and excluded from scoring instead of being marked wrong.
//   2. Grades use tolerance bands, not a pass/fail cliff.
//   3. A punch shape is only called WRONG when we're confident, and the
//      straight/hook pair is treated as ambiguous (see trajectoryVerdict).
// All numbers live in visionConfig.ts.
// ---------------------------------------------------------------------------

import { VISION_CONFIG } from './visionConfig';

export type Trajectory = 'straight' | 'hook' | 'uppercut';
export type TrajectoryVerdict = 'match' | 'mismatch' | 'unknown';

const G = VISION_CONFIG.grading;

/** True when a rep was tracked well enough to say anything about it. */
export function isVerified(meanConfidence: number | undefined): boolean {
  // Legacy reps carry no confidence: assume they were fine.
  if (meanConfidence === undefined) return true;
  return meanConfidence >= G.verifiedConfidenceFloor;
}

/**
 * Elbow-extension credit, 0-100.
 *  >= fullCreditDeg              -> 100
 *  partialCreditDeg..fullCredit  -> partialFloorScore..100 (linear)
 *  below partialCreditDeg        -> 0..partialFloorScore (linear to 60deg)
 */
export function extensionCredit(peakElbowDeg: number): number {
  if (peakElbowDeg >= G.fullCreditDeg) return 100;
  if (peakElbowDeg >= G.partialCreditDeg) {
    const t = (peakElbowDeg - G.partialCreditDeg) / (G.fullCreditDeg - G.partialCreditDeg);
    return Math.round(G.partialFloorScore + t * (100 - G.partialFloorScore));
  }
  const weakSpan = G.partialCreditDeg - 60;
  const t = Math.max(0, (peakElbowDeg - 60) / weakSpan);
  return Math.round(t * G.partialFloorScore);
}

/** A reaction is "late" only in prompted drills and only past the limit. */
export function isLateReaction(reactionMs: number | null, prompted: boolean): boolean {
  return prompted && reactionMs !== null && reactionMs > G.lateReactionMs;
}

/**
 * Three-state shape check.
 *
 * Shape is classified from 2D image-space wrist travel. When the fighter is
 * angled ~45° (the stance the setup guide asks for), a straight punch drifts
 * sideways in the image and reads as a hook, and a loose hook can read as
 * straight. Because that pair cannot be separated reliably from one webcam,
 * a straight<->hook difference is "unknown" rather than "mismatch".
 * Only a clear uppercut-vs-not difference, seen with enough wrist travel,
 * is called a mismatch.
 */
export function trajectoryVerdict(
  thrown: Trajectory,
  expected: Trajectory,
  confident: boolean
): TrajectoryVerdict {
  if (!confident) return 'unknown';
  if (thrown === expected) return 'match';
  const ambiguousPair = thrown !== 'uppercut' && expected !== 'uppercut';
  return ambiguousPair ? 'unknown' : 'mismatch';
}

export interface VerdictInputs {
  /** Peak elbow angle during the strike (deg). */
  peakElbowDeg?: number;
  /** 0-100 speed score (estimated power). */
  speedScore?: number;
  /** 0-100 guard-recovery score, when measured. */
  recoveryScore?: number;
  trajectory: TrajectoryVerdict;
}

/**
 * Weighted overall verdict, 0-100. Signals that weren't measured are dropped
 * and the remaining weights renormalised, so a missing measurement can never
 * count against the fighter.
 */
export function overallRepScore(v: VerdictInputs): number | null {
  const w = G.weights;
  const parts: [number, number][] = [];
  if (v.peakElbowDeg !== undefined) parts.push([extensionCredit(v.peakElbowDeg), w.extension]);
  if (v.speedScore !== undefined) parts.push([v.speedScore, w.speed]);
  if (v.trajectory !== 'unknown') parts.push([v.trajectory === 'match' ? 100 : 40, w.trajectory]);
  if (v.recoveryScore !== undefined) parts.push([v.recoveryScore, w.recovery]);
  const total = parts.reduce((a, [, wt]) => a + wt, 0);
  if (total === 0) return null;
  return Math.round(parts.reduce((a, [s, wt]) => a + s * wt, 0) / total);
}
