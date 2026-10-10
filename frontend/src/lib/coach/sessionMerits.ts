// ---------------------------------------------------------------------------
// Session merit formulas.
//
// Overall / Power / Reflex already have formulas in vision/page.tsx and are
// deliberately NOT redefined here. This module only adds the two merits that
// did not exist before — Stability and Swiftness — plus a helper that scopes
// a kinetic-chain average to the techniques that are actually expected to
// use that part of the chain (a jab is not supposed to show hip pivot, so it
// must not drag the "rear foot pivot" average down).
//
// Everything is a pure function of already-captured rep data, returns 0-100,
// and returns null when there isn't enough data to be honest about it.
// ---------------------------------------------------------------------------

import { MECHANICS_DATABASE, FlawMetric, techniqueKeyForCommand, techniqueKeyForTrajectory } from './mechanicsDatabase';
import type { FlawEngineRep } from './flawEngine';

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Coefficient of variation (std / mean). Returns null if the mean is too small to be meaningful. */
function coefficientOfVariation(values: number[], minMean: number): number | null {
  if (values.length < 3) return null;
  const m = mean(values);
  if (m < minMean) return null;
  return stdDev(values) / m;
}

export interface MeritRep extends FlawEngineRep {
  peakVelocity: number; // deg/s, existing per-rep measurement
  reactionMs: number | null;
}

function resolveTechnique(rep: FlawEngineRep) {
  return rep.command === 'FREESTYLE'
    ? techniqueKeyForTrajectory(rep.trajectory)
    : techniqueKeyForCommand(rep.command);
}

// ---------------------------------------------------------------------------
// STABILITY — "how repeatable and controlled is your technique?"
//
//   A. Technique repeatability (weight 0.5, or 0.7 when no timing data):
//      per-rep chain quality q = mean(torso, hip, knee, weight-transfer,
//      foot-pivot, power). For each technique with >= 3 landed reps take the
//      coefficient of variation CV = std(q)/mean(q); score = 100*(1 - CV/0.6).
//      CV of 0 (identical reps) = 100, CV >= 0.6 (very erratic) = 0. Techniques
//      are combined weighted by their rep count. Comparing within a technique
//      means a jab and a cross are never penalised for being different.
//   B. Timing repeatability (weight 0.3): CV of reaction times across landed
//      coached reps (>= 3); score = 100*(1 - CV/0.5).
//   C. Frame steadiness (weight 0.2, or 0.3 when no timing data): the existing
//      tracking-confidence score (how steadily the body stayed readable and in
//      frame), passed in as `steadinessScore`.
//
// Weights are re-normalised over whichever components have data.
// ---------------------------------------------------------------------------
export function computeStabilityScore(reps: MeritRep[], steadinessScore: number | null): number | null {
  const landedPunches = reps.filter((r) => r.hit && r.kind === 'punch');

  // A. technique repeatability
  const groups = new Map<string, number[]>();
  for (const r of landedPunches) {
    const key = resolveTechnique(r);
    if (!key) continue;
    const q = mean([
      r.torsoRotationScore, r.hipRotationScore, r.kneeDriveScore,
      r.weightTransferScore, r.footPivotScore, r.estimatedPower,
    ]);
    const list = groups.get(key) ?? [];
    list.push(q);
    groups.set(key, list);
  }
  let weightedSum = 0;
  let weightTotal = 0;
  groups.forEach((qs) => {
    const cv = coefficientOfVariation(qs, 5);
    if (cv === null) return;
    weightedSum += clamp(100 * (1 - cv / 0.6)) * qs.length;
    weightTotal += qs.length;
  });
  const techniqueRepeatability = weightTotal > 0 ? weightedSum / weightTotal : null;

  // B. timing repeatability
  const reactions = reps
    .filter((r) => r.hit && r.reactionMs !== null && r.reactionMs > 0)
    .map((r) => r.reactionMs as number);
  const rtCv = coefficientOfVariation(reactions, 50);
  const timingRepeatability = rtCv === null ? null : clamp(100 * (1 - rtCv / 0.5));

  const parts: Array<{ value: number; weight: number }> = [];
  if (techniqueRepeatability !== null) parts.push({ value: techniqueRepeatability, weight: 0.5 });
  if (timingRepeatability !== null) parts.push({ value: timingRepeatability, weight: 0.3 });
  if (steadinessScore !== null) parts.push({ value: steadinessScore, weight: 0.2 });
  if (parts.length === 0) return null;
  // Need at least one real repeatability signal; steadiness alone isn't "stability of technique".
  if (techniqueRepeatability === null && timingRepeatability === null) return null;

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);
}

// ---------------------------------------------------------------------------
// SWIFTNESS — "how fast and how quickly do you move?"
//
//   Strike speed (weight 0.6, or 0.65 in freestyle): MEAN peak hand velocity
//     of landed punches / 900 deg/s reference, x100. Mean (not max) so one
//     lucky fast punch can't carry the score — it has to be sustained.
//   Quickness (coached modes, weight 0.4): per-rep response quality
//     clamp((700ms - reaction) / 450ms), averaged over landed reps with a
//     recorded reaction time. 250ms = 100, 700ms+ = 0.
//   Cadence (freestyle only, weight 0.35): landed punches per minute / 60,
//     capped at 100. 60/min (one punch per second) = full marks.
//
// Weights are re-normalised over whichever components have data.
// ---------------------------------------------------------------------------
export function computeSwiftnessScore(
  reps: MeritRep[],
  opts: { isFreestyle: boolean; elapsedSeconds: number; referenceVelocity: number }
): number | null {
  const landedPunches = reps.filter((r) => r.hit && r.kind === 'punch' && r.peakVelocity > 0);
  const strikeSpeed = landedPunches.length >= 3
    ? clamp((mean(landedPunches.map((r) => r.peakVelocity)) / opts.referenceVelocity) * 100)
    : null;

  let secondary: number | null = null;
  let secondaryWeight = 0;
  let primaryWeight = 0.6;

  if (opts.isFreestyle) {
    const minutes = Math.max(opts.elapsedSeconds, 1) / 60;
    const allLanded = reps.filter((r) => r.hit && r.kind === 'punch').length;
    if (opts.elapsedSeconds >= 20 && allLanded >= 3) {
      secondary = clamp((allLanded / minutes / 60) * 100);
      secondaryWeight = 0.35;
      primaryWeight = 0.65;
    }
  } else {
    const rts = reps.filter((r) => r.hit && r.reactionMs !== null && r.reactionMs > 0).map((r) => r.reactionMs as number);
    if (rts.length >= 3) {
      secondary = mean(rts.map((rt) => clamp(((700 - rt) / 450) * 100)));
      secondaryWeight = 0.4;
    }
  }

  if (strikeSpeed === null && secondary === null) return null;
  if (strikeSpeed === null) return Math.round(secondary as number);
  if (secondary === null) return Math.round(strikeSpeed);
  return Math.round((strikeSpeed * primaryWeight + secondary * secondaryWeight) / (primaryWeight + secondaryWeight));
}

/**
 * Technique-aware attainment for one metric: for every landed punch whose
 * technique has a target for `metric`, score / target (capped at 1.25 so one
 * huge rep can't hide many weak ones). Returns the mean ratio (1.0 = hitting
 * target on average) and sample count, or null with fewer than `minSamples`.
 *
 * This is what lets "low pivot" be judged per punch type: a jab is held to
 * the jab's pivot target, a cross to the cross's — instead of one fixed bar
 * that jab-heavy sessions could never clear.
 */
export function targetAttainment(
  reps: FlawEngineRep[],
  metric: FlawMetric,
  minSamples = 1
): { ratio: number; samples: number } | null {
  const ratios: number[] = [];
  for (const r of reps) {
    if (!r.hit || r.kind !== 'punch') continue;
    const key = resolveTechnique(r);
    if (!key) continue;
    const target = MECHANICS_DATABASE[key].targets[metric];
    if (target === undefined || target <= 0) continue;
    const v = metric === 'trajectoryMatchRate' ? (r.trajectoryMatch ? 100 : 0) : (r[metric] as number);
    ratios.push(Math.min(1.25, v / target));
  }
  return ratios.length >= minSamples ? { ratio: mean(ratios), samples: ratios.length } : null;
}
