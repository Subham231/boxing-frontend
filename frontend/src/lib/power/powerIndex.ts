// ---------------------------------------------------------------------------
// Power Index — shared by AI Video Analysis and Spar.
//
// A camera cannot measure force, so "power" here is an honest ESTIMATE of how
// much punch the technique can deliver. Speed alone under-rates good boxers
// (a jab is fast but turns little; a cross is slower but loads the whole
// body), so power is built from what coaches actually look at:
//
//   speed  (0.40) — peak hand speed on a concave curve: the first 60% of
//                   reference speed already earns ~70, so normal-speed clean
//                   punches are not punished.
//   form   (0.45) — technique-aware kinetic-chain attainment: hips, torso,
//                   foot pivot, weight transfer, knee drive measured against
//                   what THAT punch is expected to show (a jab is held to the
//                   jab's targets, a cross to the cross's). Beating a target
//                   is capped so one big rep can't hide weak ones.
//                   In spar (no chain data) this is elbow-extension credit.
//   shape  (0.15) — the punch travelled the called/expected path.
//
// Missing components are dropped and weights renormalised. The raw 0-100
// blend is then mapped through a gentle lift so a properly thrown punch
// lands in the 75-95 band and sloppy ones still sit above the floor:
//
//      power = 30 + 70 * (raw / 100) ^ 0.9        (never below 30 for a landed punch)
//
// Pure functions, client + server safe.
// ---------------------------------------------------------------------------

import { MECHANICS_DATABASE, techniqueKeyForCommand, techniqueKeyForTrajectory, type FlawMetric } from '@/lib/coach/mechanicsDatabase';

export const POWER_FLOOR = 30;

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** speedRatio = measured peak speed / reference speed (1.0 = a full-speed punch). */
export function speedComponent(speedRatio: number): number {
  if (!Number.isFinite(speedRatio) || speedRatio <= 0) return 0;
  // Reference for the curve is 95% of the full-power speed, so ratio 0.95 -> 100.
  return clamp(100 * Math.pow(Math.min(1, speedRatio / 0.95), 0.7));
}

export interface ChainScores {
  torsoRotationScore?: number;
  hipRotationScore?: number;
  kneeDriveScore?: number;
  weightTransferScore?: number;
  footPivotScore?: number;
}

const CHAIN_METRICS: FlawMetric[] = [
  'torsoRotationScore',
  'hipRotationScore',
  'kneeDriveScore',
  'weightTransferScore',
  'footPivotScore',
];

/** 0-100 attainment of the kinetic chain vs the targets of this technique, or null when none apply. */
export function chainComponent(
  command: string,
  trajectory: 'straight' | 'hook' | 'uppercut',
  chain: ChainScores,
): number | null {
  const key = command === 'FREESTYLE' ? techniqueKeyForTrajectory(trajectory) : techniqueKeyForCommand(command);
  if (!key) return null;
  const targets = MECHANICS_DATABASE[key].targets;
  const ratios: number[] = [];
  for (const m of CHAIN_METRICS) {
    const target = targets[m];
    const value = (chain as Record<string, number | undefined>)[m];
    if (target === undefined || target <= 0 || value === undefined) continue;
    ratios.push(Math.min(1.15, value / target));
  }
  if (ratios.length === 0) return null;
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  // Hitting the target = 85; beating it earns up to 100.
  return clamp(mean * 85);
}

export interface PowerInputs {
  speedRatio: number;
  /** Technique-aware chain attainment (0-100) OR elbow-extension credit in spar. */
  form?: number | null;
  /** true/false when shape was judged; undefined/null when unknown (not counted). */
  shapeMatch?: boolean | null;
}

export function computePowerIndex(i: PowerInputs): number {
  const parts: Array<[number, number]> = [[speedComponent(i.speedRatio), 0.4]];
  if (i.form !== undefined && i.form !== null && Number.isFinite(i.form)) parts.push([clamp(i.form), 0.45]);
  if (i.shapeMatch === true) parts.push([100, 0.15]);
  else if (i.shapeMatch === false) parts.push([65, 0.15]);
  const w = parts.reduce((s, [, x]) => s + x, 0);
  const raw = parts.reduce((s, [v, x]) => s + v * x, 0) / w;
  const lifted = POWER_FLOOR + (100 - POWER_FLOOR) * Math.pow(clamp(raw) / 100, 0.9);
  return Math.round(clamp(lifted, POWER_FLOOR, 100));
}

/** Vision helper: full-chain power for one landed rep. */
export function powerForRep(args: {
  peakVelocity: number;
  referenceVelocity: number;
  command: string;
  trajectory: 'straight' | 'hook' | 'uppercut';
  trajectoryMatch: boolean;
  trajectoryConfident: boolean;
  chain: ChainScores;
}): number {
  return computePowerIndex({
    speedRatio: args.peakVelocity / args.referenceVelocity,
    form: chainComponent(args.command, args.trajectory, args.chain),
    shapeMatch: args.trajectoryConfident ? args.trajectoryMatch : null,
  });
}
