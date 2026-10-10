// ---------------------------------------------------------------------------
// Spar scoring — the SAME algorithm as AI Video Analysis, applied to a coached
// spar round. Pure functions, safe on client and server.
//
//   overall = accuracy 0.35 + reflex 0.25 + power 0.20 + stability 0.20
//
// Components with no data are dropped and the weights renormalised, so a
// missing measurement never counts against a fighter.
//
//   accuracy  — landed commands / commands the camera could fairly judge. A
//               miss on an unverifiable command is excluded (lenient rule from
//               vision grading); a landed punch always counts, weighted by its
//               rep quality (extension 0.4 + speed 0.25, as in repVerdict).
//   reflex    — average reaction time, same mapping as solo reflex.
//   power     — mean power (peak wrist speed) of landed punches.
//   stability — repeatability: low spread of rep quality and of reaction
//               times across landed punches (coefficient of variation).
// ---------------------------------------------------------------------------

import { isVerified } from '@/lib/vision/repVerdict';

export const SPAR_WEIGHTS = { accuracy: 0.35, reflex: 0.25, power: 0.2, stability: 0.2 } as const;

export interface ScorableCommand {
  hit: boolean;
  reactionMs: number | null;
  power?: number;
  form?: number;
  trackingConfidence?: number;
}

export interface SparScoreParts {
  accuracy: number | null;
  reflex: number | null;
  power: number | null;
  stability: number | null;
  overall: number;
  landed: number;
  verifiedCalls: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function cv(xs: number[], minMean: number): number | null {
  if (xs.length < 3) return null;
  const m = mean(xs);
  if (m < minMean) return null;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

export function reflexFromReactionMs(avgMs: number | null): number | null {
  if (avgMs == null) return null;
  return Math.round(clamp((900 - avgMs) / 700, 0, 1) * 100);
}

/** Quality 0-100 of one landed punch: extension (form) 0.4 + speed (power) 0.25, renormalised. */
export function repQuality(c: ScorableCommand): number {
  const form = finite(c.form) ? clamp(c.form) : null;
  const speed = finite(c.power) ? clamp(c.power) : null;
  if (form !== null && speed !== null) return Math.round((form * 0.4 + speed * 0.25) / 0.65);
  if (form !== null) return Math.round(form);
  if (speed !== null) return Math.round(speed);
  return 70;
}

export function computeSparScoreParts(commands: ScorableCommand[], _totalCommands?: number): SparScoreParts {
  const landed = commands.filter((c) => c.hit);
  const missesVerified = commands.filter((c) => !c.hit && isVerified(c.trackingConfidence));
  const verifiedCalls = landed.length + missesVerified.length;

  let accuracy: number | null = null;
  if (verifiedCalls > 0) {
    const credit = landed.reduce((s, c) => s + repQuality(c) / 100, 0);
    // A landed punch is worth at least 75% of a clean one, so hit/miss still dominates.
    const floored = Math.max(credit, landed.length * 0.75);
    accuracy = Math.round(clamp((floored / verifiedCalls) * 100));
  }

  const reactions = landed
    .filter((c) => finite(c.reactionMs) && (c.reactionMs as number) > 0)
    .map((c) => c.reactionMs as number);
  const reflex = reactions.length ? reflexFromReactionMs(Math.round(mean(reactions))) : null;

  const powers = landed.filter((c) => finite(c.power)).map((c) => clamp(c.power as number));
  const power = powers.length ? Math.round(mean(powers)) : null;

  const qCv = cv(landed.map(repQuality), 5);
  const rtCv = cv(reactions, 50);
  const stabParts: Array<[number, number]> = [];
  if (qCv !== null) stabParts.push([clamp(100 * (1 - qCv / 0.6)), 0.6]);
  if (rtCv !== null) stabParts.push([clamp(100 * (1 - rtCv / 0.5)), 0.4]);
  const stability = stabParts.length
    ? Math.round(stabParts.reduce((s, [v, w]) => s + v * w, 0) / stabParts.reduce((s, [, w]) => s + w, 0))
    : null;

  const comps: Array<[number | null, number]> = [
    [accuracy, SPAR_WEIGHTS.accuracy],
    [reflex, SPAR_WEIGHTS.reflex],
    [power, SPAR_WEIGHTS.power],
    [stability, SPAR_WEIGHTS.stability],
  ];
  const present = comps.filter((c): c is [number, number] => c[0] !== null);
  const wTotal = present.reduce((s, [, w]) => s + w, 0);
  const overall =
    wTotal > 0 ? Math.round((present.reduce((s, [v, w]) => s + v * w, 0) / wTotal) * 10) / 10 : 0;

  return { accuracy, reflex, power, stability, overall, landed: landed.length, verifiedCalls };
}
