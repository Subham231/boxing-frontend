import {
  MECHANICS_DATABASE,
  TechniqueKey,
  FlawMetric,
  FlawRule,
  Severity,
  techniqueKeyForCommand,
  techniqueKeyForTrajectory,
} from './mechanicsDatabase';

// Minimal shape this engine needs from a rep — matches (a superset of)
// RepLogEntry in vision/page.tsx so no data transformation is required at
// the call site.
export interface FlawEngineRep {
  command: string;
  kind: 'punch' | 'defense';
  hit: boolean;
  estimatedPower: number;
  hipRotationScore: number;
  torsoRotationScore: number;
  kneeDriveScore: number;
  weightTransferScore: number;
  footPivotScore: number;
  headLateralScore: number;
  headDropScore: number;
  trajectory: 'straight' | 'hook' | 'uppercut';
  trajectoryMatch: boolean;
}

export interface DetectedFlaw {
  techniqueLabel: string;
  metric: FlawMetric;
  measuredValue: number; // the real session-average value that triggered this
  targetValue: number;
  severity: Severity;
  cause: string;
  coachingTip: string;
  correctiveExercise: string;
  recommendedFrequency: string;
  progressionTarget: string;
  sampleSize: number; // how many reps of this technique this flaw is based on
}

const SEVERITY_WEIGHT: Record<Severity, number> = { major: 3, moderate: 2, minor: 1 };

// Require a minimum sample size before trusting an averaged flaw — one bad
// rep shouldn't produce a confident session-level diagnosis.
const MIN_SAMPLE_SIZE = 2;

function metricValue(rep: FlawEngineRep, metric: FlawMetric): number {
  switch (metric) {
    case 'trajectoryMatchRate': return rep.trajectoryMatch ? 100 : 0;
    default: return rep[metric];
  }
}

/**
 * Evaluate a completed session's rep log against the mechanics database.
 * Every returned flaw carries the real averaged measurement that triggered
 * it (evidence), never an invented or estimated one. Reps that didn't land
 * (hit === false) are excluded — there's no biomechanics data to trust on a
 * miss.
 */
export function evaluateSessionFlaws(reps: FlawEngineRep[]): DetectedFlaw[] {
  const landedReps = reps.filter((r) => r.hit);
  if (landedReps.length === 0) return [];

  // Group landed reps by resolved technique key.
  const byTechnique = new Map<TechniqueKey, FlawEngineRep[]>();
  for (const rep of landedReps) {
    const key = rep.command === 'FREESTYLE'
      ? techniqueKeyForTrajectory(rep.trajectory)
      : techniqueKeyForCommand(rep.command);
    if (!key) continue;
    const mechanics = MECHANICS_DATABASE[key];
    // Only group defense reps under defense techniques and punches under
    // punch techniques — guards against a mislabeled rep polluting a group.
    if (mechanics.kind !== rep.kind) continue;
    const list = byTechnique.get(key) ?? [];
    list.push(rep);
    byTechnique.set(key, list);
  }

  const flaws: DetectedFlaw[] = [];

  byTechnique.forEach((techReps, techniqueKey) => {
    if (techReps.length < MIN_SAMPLE_SIZE) return;
    const mechanics = MECHANICS_DATABASE[techniqueKey];

    for (const rule of mechanics.flaws) {
      const values = techReps.map((r) => metricValue(r, rule.metric));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const triggered = rule.comparator === 'below' ? avg < rule.threshold : avg > rule.threshold;
      if (!triggered) continue;

      flaws.push({
        techniqueLabel: mechanics.label,
        metric: rule.metric,
        measuredValue: Math.round(avg),
        targetValue: mechanics.targets[rule.metric] ?? rule.threshold,
        severity: rule.severity,
        cause: rule.cause,
        coachingTip: rule.coachingTip,
        correctiveExercise: rule.correctiveExercise,
        recommendedFrequency: rule.recommendedFrequency,
        progressionTarget: rule.progressionTarget,
        sampleSize: techReps.length,
      });
    }
  });

  // Rank by severity first, then by how far below/above target (worse first).
  flaws.sort((a, b) => {
    const sevDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return Math.abs(a.measuredValue - a.targetValue) < Math.abs(b.measuredValue - b.targetValue) ? 1 : -1;
  });

  return flaws;
}

/** Convenience: top N flaws for the session report (spec asks for 3-5). */
export function topSessionFlaws(reps: FlawEngineRep[], max = 5): DetectedFlaw[] {
  return evaluateSessionFlaws(reps).slice(0, max);
}

/**
 * Per-technique strongest/weakest summary — used to answer "strongest
 * skills / weakest skills" from the coaching-engine spec without inventing
 * anything: it's a direct readout of which technique's key metric scored
 * highest/lowest.
 */
export interface TechniqueSummary {
  technique: TechniqueKey;
  label: string;
  primaryMetric: FlawMetric;
  avgScore: number;
  sampleSize: number;
}

export function summarizeTechniques(reps: FlawEngineRep[]): TechniqueSummary[] {
  const landedReps = reps.filter((r) => r.hit);
  const byTechnique = new Map<TechniqueKey, FlawEngineRep[]>();
  for (const rep of landedReps) {
    const key = rep.command === 'FREESTYLE'
      ? techniqueKeyForTrajectory(rep.trajectory)
      : techniqueKeyForCommand(rep.command);
    if (!key) continue;
    if (MECHANICS_DATABASE[key].kind !== rep.kind) continue;
    const list = byTechnique.get(key) ?? [];
    list.push(rep);
    byTechnique.set(key, list);
  }

  const summaries: TechniqueSummary[] = [];
  byTechnique.forEach((techReps, key) => {
    const mechanics = MECHANICS_DATABASE[key];
    const targetEntries = Object.keys(mechanics.targets) as FlawMetric[];
    if (targetEntries.length === 0) return;
    // Primary metric = the technique's first/most defining target (e.g. hip
    // rotation for the cross, knee drive for the uppercut).
    const primaryMetric = targetEntries[0];
    const avg = techReps.reduce((sum, r) => sum + metricValue(r, primaryMetric), 0) / techReps.length;
    summaries.push({
      technique: key,
      label: mechanics.label,
      primaryMetric,
      avgScore: Math.round(avg),
      sampleSize: techReps.length,
    });
  });

  return summaries.sort((a, b) => b.avgScore - a.avgScore);
}
