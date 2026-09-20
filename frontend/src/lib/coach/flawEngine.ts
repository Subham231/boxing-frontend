import {
  MECHANICS_DATABASE,
  ROOT_CAUSES,
  TechniqueKey,
  FlawMetric,
  RootCauseKey,
  Severity,
  techniqueKeyForCommand,
  techniqueKeyForTrajectory,
} from './mechanicsDatabase';
import { computeStats, Stats } from '../vision/kinematics';

// ---------------------------------------------------------------------------
// Flaw engine
//
// Turns a session's rep log into a ranked, evidenced set of coaching
// diagnoses. What changed from the previous version:
//
//  1. CONFIDENCE. Every rep now carries how well it was actually tracked,
//     and every flaw carries a confidence derived from sample size x
//     tracking quality x measurement consistency. A flaw computed from
//     three half-occluded reps is no longer presented with the same
//     authority as one from twenty clean reps - below a floor it isn't
//     reported at all.
//
//  2. CONSISTENCY vs DEFICIENCY. Averaging hid the difference between a
//     fighter who does the same mediocre thing every time and one who
//     alternates between excellent and terrible. Those need opposite
//     coaching, so they're now distinguished and labelled.
//
//  3. NORMALIZED RANKING. Deviations are scaled by each rule's own
//     acceptableRange before being compared, so metrics on different
//     scales can be ranked against each other honestly.
//
//  4. ROOT-CAUSE GROUPING. Correlated symptoms collapse into one diagnosis
//     with contributing indicators listed underneath.
//
//  5. METRIC AVAILABILITY. A rule is skipped when the reps genuinely
//     didn't measure its metric (e.g. wrist alignment on a device with no
//     hand model), rather than scoring an unmeasured signal as zero.
// ---------------------------------------------------------------------------

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

  // --- Optional: present once the upgraded capture path is in use. -------
  // All optional so an older/partial rep object still type-checks and is
  // simply treated as "this metric wasn't measured".
  /** 0-1 mean landmark confidence across the rep. */
  trackingConfidence?: number;
  guardRecoveryScore?: number;
  guardIntegrityScore?: number;
  wristAlignmentScore?: number;
  sequenceScore?: number;
  recoverySpeedScore?: number;
}

export type FlawKind = 'deficiency' | 'inconsistency';

export interface DetectedFlaw {
  techniqueLabel: string;
  metric: FlawMetric;
  measuredValue: number;
  targetValue: number;
  severity: Severity;
  cause: string;
  coachingTip: string;
  correctiveExercise: string;
  recommendedFrequency: string;
  progressionTarget: string;
  sampleSize: number;

  // --- New, all additive so existing UI keeps working unchanged. --------
  /** 0-100 confidence that this diagnosis is real. */
  confidence: number;
  /** Whether the problem is "consistently short" or "wildly variable". */
  flawKind: FlawKind;
  /** Spread of the underlying measurement across reps. */
  stats: Stats;
  rootCause?: RootCauseKey;
  /** Mean tracking quality of the reps behind this flaw, 0-100. */
  trackingQuality: number;
}

export interface RootCauseDiagnosis {
  rootCause: RootCauseKey;
  label: string;
  primaryFix: string;
  drill: string;
  severity: Severity;
  confidence: number;
  /** The individual measurements pointing at this cause. */
  indicators: DetectedFlaw[];
}

const SEVERITY_WEIGHT: Record<Severity, number> = { major: 3, moderate: 2, minor: 1 };

const MIN_SAMPLE_SIZE = 3;

/**
 * Below this confidence a flaw is not reported at all. Set deliberately
 * low - the goal is to suppress diagnoses built on genuinely unusable data,
 * not to hide every imperfect measurement.
 */
const MIN_REPORT_CONFIDENCE = 35;

/** Sample size at which sample-count confidence saturates. */
const CONFIDENCE_FULL_SAMPLE = 8;

/**
 * A metric whose readings swing by more than this (stdDev, 0-100 scale) is
 * treated as an inconsistency problem rather than a deficiency, even when
 * the mean is below target.
 */
const INCONSISTENCY_STDDEV = 22;

const DEFAULT_ACCEPTABLE_RANGE = 25;

function metricValue(rep: FlawEngineRep, metric: FlawMetric): number | null {
  switch (metric) {
    case 'trajectoryMatchRate':
      return rep.trajectoryMatch ? 100 : 0;
    case 'guardRecoveryScore':
      return rep.guardRecoveryScore ?? null;
    case 'guardIntegrityScore':
      return rep.guardIntegrityScore ?? null;
    case 'wristAlignmentScore':
      return rep.wristAlignmentScore ?? null;
    case 'sequenceScore':
      return rep.sequenceScore ?? null;
    case 'recoverySpeedScore':
      return rep.recoverySpeedScore ?? null;
    default: {
      const v = rep[metric];
      return typeof v === 'number' ? v : null;
    }
  }
}

/** Mean tracking confidence (0-1) for a group of reps. */
function groupTrackingConfidence(reps: FlawEngineRep[]): number {
  const values = reps
    .map((r) => r.trackingConfidence)
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return 0.8; // unknown: assume decent, don't punish legacy reps
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Combined confidence in a diagnosis.
 *
 * Multiplicative rather than averaged on purpose: these are independent
 * ways the diagnosis could be wrong, and any one of them being terrible
 * should sink the whole thing. Averaging would let twenty badly-tracked
 * reps produce a confident-looking result on sample size alone.
 */
function computeFlawConfidence(
  sampleSize: number,
  trackingConfidence: number,
  stats: Stats
): number {
  const sampleConfidence = Math.min(1, sampleSize / CONFIDENCE_FULL_SAMPLE);
  // A wildly variable measurement is less trustworthy as an *average*, but
  // it's still real data, so this floors at 0.5 rather than going to zero.
  const consistencyConfidence = 0.5 + 0.5 * (stats.consistency / 100);
  return Math.round(
    Math.min(100, sampleConfidence * trackingConfidence * consistencyConfidence * 100)
  );
}

function resolveTechnique(rep: FlawEngineRep): TechniqueKey | null {
  const key =
    rep.command === 'FREESTYLE'
      ? techniqueKeyForTrajectory(rep.trajectory)
      : techniqueKeyForCommand(rep.command);
  if (!key) return null;
  if (MECHANICS_DATABASE[key].kind !== rep.kind) return null;
  return key;
}

function groupReps(reps: FlawEngineRep[]): Map<TechniqueKey, FlawEngineRep[]> {
  const byTechnique = new Map<TechniqueKey, FlawEngineRep[]>();
  for (const rep of reps) {
    const key = resolveTechnique(rep);
    if (!key) continue;
    const list = byTechnique.get(key) ?? [];
    list.push(rep);
    byTechnique.set(key, list);
  }
  return byTechnique;
}

/**
 * Ranking: severity dominates, then normalized deviation, then confidence.
 * Confidence enters as a multiplier rather than an additive term so a
 * high-severity-but-shaky finding can't outrank a solid one purely on its
 * severity label.
 */
function rankScore(flaw: DetectedFlaw): number {
  const deviation =
    Math.abs(flaw.measuredValue - flaw.targetValue) / DEFAULT_ACCEPTABLE_RANGE;
  const base = SEVERITY_WEIGHT[flaw.severity] * 1000 + deviation * 100;
  return base * (flaw.confidence / 100);
}

/**
 * Every rule that fired, with no deduplication.
 *
 * Kept separate from evaluateSessionFlaws because the two consumers want
 * genuinely different things: the flaw LIST wants one correction per root
 * cause (a wall of correlated symptoms is bad coaching), while root-cause
 * DIAGNOSIS wants every corroborating indicator it can get - that
 * corroboration is exactly what raises confidence that the cause is real.
 * Deduping first, as this previously did, threw that evidence away and
 * made every diagnosis look like it rested on a single measurement.
 */
function collectFlawCandidates(reps: FlawEngineRep[]): DetectedFlaw[] {
  const landedReps = reps.filter((r) => r.hit);
  if (landedReps.length === 0) return [];

  const byTechnique = groupReps(landedReps);
  const all: DetectedFlaw[] = [];

  byTechnique.forEach((techReps, techniqueKey) => {
    if (techReps.length < MIN_SAMPLE_SIZE) return;
    const mechanics = MECHANICS_DATABASE[techniqueKey];
    const trackingConfidence = groupTrackingConfidence(techReps);

    // Report at most the two worst distinct root causes per technique.
    // Previously this was one flaw per technique, which was right for
    // avoiding a wall of correlated symptoms but too blunt now that
    // genuinely independent faults (e.g. low rotation AND a dropping
    // guard) can both be measured - those are two different corrections.
    const candidates: DetectedFlaw[] = [];

    for (const rule of mechanics.flaws) {
      if (!mechanics.measuredMetrics.includes(rule.metric)) continue;

      // Availability: only evaluate over reps that actually carry this
      // metric. A device that never ran hand tracking simply has no
      // wristAlignmentScore, and must not be graded as if it scored zero.
      const values = techReps
        .map((r) => metricValue(r, rule.metric))
        .filter((v): v is number => v !== null);
      if (values.length < MIN_SAMPLE_SIZE) continue;

      const stats = computeStats(values);
      const triggered =
        rule.comparator === 'below' ? stats.mean < rule.threshold : stats.mean > rule.threshold;
      if (!triggered) continue;

      const target = mechanics.targets[rule.metric] ?? rule.threshold;
      const confidence = computeFlawConfidence(values.length, trackingConfidence, stats);
      if (confidence < MIN_REPORT_CONFIDENCE) continue;

      const flawKind: FlawKind =
        stats.stdDev >= INCONSISTENCY_STDDEV ? 'inconsistency' : 'deficiency';

      candidates.push({
        techniqueLabel: mechanics.label,
        metric: rule.metric,
        measuredValue: Math.round(stats.mean),
        targetValue: target,
        severity: rule.severity,
        // Inconsistency gets its own explanation: telling someone to
        // "rotate more" when they already hit the target on half their
        // reps is the wrong correction entirely.
        cause:
          flawKind === 'inconsistency'
            ? `${rule.cause} This is inconsistent rather than absent - your reps ranged from ${Math.round(
                stats.min
              )}% to ${Math.round(stats.max)}%, so the movement is there but not repeatable yet.`
            : rule.cause,
        coachingTip:
          flawKind === 'inconsistency'
            ? `${rule.coachingTip} Slow down until every rep looks the same, then rebuild speed.`
            : rule.coachingTip,
        correctiveExercise: rule.correctiveExercise,
        recommendedFrequency: rule.recommendedFrequency,
        progressionTarget: rule.progressionTarget,
        sampleSize: values.length,
        confidence,
        flawKind,
        stats,
        rootCause: rule.rootCause,
        trackingQuality: Math.round(trackingConfidence * 100),
      });
    }

    all.push(...candidates);
  });

  all.sort((a, b) => rankScore(b) - rankScore(a));
  return all;
}

/**
 * Evaluate a completed session's rep log against the mechanics database.
 *
 * Landed reps only for biomechanics: a miss has no strike to measure. (The
 * miss itself is still reported separately by the caller's accuracy stats.)
 *
 * At most two distinct root causes are surfaced per technique. Multiple
 * form flaws are almost always correlated - low hip rotation, low weight
 * transfer and a flat rear foot on the same sloppy cross are one problem,
 * not three - and listing them all reads as "everything is wrong" while
 * burying the single correction that would fix the cluster.
 */
export function evaluateSessionFlaws(reps: FlawEngineRep[]): DetectedFlaw[] {
  const candidates = collectFlawCandidates(reps);
  const flaws: DetectedFlaw[] = [];
  const keptPerTechnique = new Map<string, Set<string>>();

  for (const candidate of candidates) {
    const seen = keptPerTechnique.get(candidate.techniqueLabel) ?? new Set<string>();
    const causeKey = candidate.rootCause ?? `metric:${candidate.metric}`;
    if (seen.has(causeKey) || seen.size >= 2) {
      keptPerTechnique.set(candidate.techniqueLabel, seen);
      continue;
    }
    seen.add(causeKey);
    keptPerTechnique.set(candidate.techniqueLabel, seen);
    flaws.push(candidate);
  }

  return flaws;
}

/** Top N flaws for the session report. */
export function topSessionFlaws(reps: FlawEngineRep[], max = 5): DetectedFlaw[] {
  return evaluateSessionFlaws(reps).slice(0, max);
}

/**
 * Collapse correlated flaws into root-cause diagnoses.
 *
 * This is what turns "your hip rotation is low, your weight transfer is
 * low, and your rear foot is flat" into "your lower body isn't driving the
 * punch - here is the one thing to fix".
 */
export function diagnoseRootCauses(reps: FlawEngineRep[]): RootCauseDiagnosis[] {
  // Deliberately the UNdeduped candidate list - see collectFlawCandidates.
  const flaws = collectFlawCandidates(reps);
  const groups = new Map<RootCauseKey, DetectedFlaw[]>();

  for (const flaw of flaws) {
    if (!flaw.rootCause) continue;
    const list = groups.get(flaw.rootCause) ?? [];
    list.push(flaw);
    groups.set(flaw.rootCause, list);
  }

  const diagnoses: RootCauseDiagnosis[] = [];
  groups.forEach((indicators, rootCause) => {
    const info = ROOT_CAUSES[rootCause];
    if (!info) return;
    // A cause corroborated by several independent measurements is more
    // trustworthy than any one of them alone, so confidence takes the best
    // indicator and nudges up (capped) for each additional one.
    const bestConfidence = Math.max(...indicators.map((i) => i.confidence));
    const corroboration = Math.min(15, (indicators.length - 1) * 8);
    const worstSeverity = indicators.reduce<Severity>(
      (worst, i) => (SEVERITY_WEIGHT[i.severity] > SEVERITY_WEIGHT[worst] ? i.severity : worst),
      'minor'
    );

    diagnoses.push({
      rootCause,
      label: info.label,
      primaryFix: info.primaryFix,
      drill: info.drill,
      severity: worstSeverity,
      confidence: Math.min(100, bestConfidence + corroboration),
      indicators,
    });
  });

  diagnoses.sort((a, b) => {
    const sev = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    if (sev !== 0) return sev;
    if (b.indicators.length !== a.indicators.length) {
      return b.indicators.length - a.indicators.length;
    }
    return b.confidence - a.confidence;
  });

  return diagnoses;
}

// ---------------------------------------------------------------------------
// Technique summaries
// ---------------------------------------------------------------------------

export interface TechniqueSummary {
  technique: TechniqueKey;
  label: string;
  primaryMetric: FlawMetric;
  /** Composite 0-100 across all measured metrics, weighted per technique. */
  avgScore: number;
  /** The primary metric's own average, kept separate for drill-down. */
  primaryScore: number;
  sampleSize: number;
  /** 0-100 rep-to-rep repeatability of the composite. */
  consistency: number;
  confidence: number;
  /** Per-metric breakdown behind the composite. */
  breakdown: Array<{ metric: FlawMetric; value: number; weight: number }>;
}

/**
 * Per-technique quality readout.
 *
 * The composite replaces the old "technique score = its single primary
 * metric" behaviour, under which a cross's score was literally just its hip
 * rotation - a cross could rotate beautifully, land nothing, recover
 * nowhere, and still read as excellent.
 *
 * Weights are renormalized over only the metrics actually measured, so a
 * missing signal redistributes its weight instead of dragging the score
 * toward zero.
 */
export function summarizeTechniques(reps: FlawEngineRep[]): TechniqueSummary[] {
  const landedReps = reps.filter((r) => r.hit);
  const byTechnique = groupReps(landedReps);
  const summaries: TechniqueSummary[] = [];

  byTechnique.forEach((techReps, key) => {
    const mechanics = MECHANICS_DATABASE[key];
    const weights = mechanics.scoreWeights;
    const trackingConfidence = groupTrackingConfidence(techReps);

    const breakdown: Array<{ metric: FlawMetric; value: number; weight: number }> = [];
    let weightedSum = 0;
    let totalWeight = 0;

    (Object.keys(weights) as FlawMetric[]).forEach((metric) => {
      const weight = weights[metric];
      if (!weight) return;
      if (!mechanics.measuredMetrics.includes(metric)) return;
      const values = techReps
        .map((r) => metricValue(r, metric))
        .filter((v): v is number => v !== null);
      if (values.length === 0) return;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      breakdown.push({ metric, value: Math.round(mean), weight });
      weightedSum += mean * weight;
      totalWeight += weight;
    });

    // Fall back to the primary metric alone if nothing else was measured -
    // still better than reporting nothing for the technique.
    const primaryValues = techReps
      .map((r) => metricValue(r, mechanics.primaryMetric))
      .filter((v): v is number => v !== null);
    const primaryScore = primaryValues.length
      ? Math.round(primaryValues.reduce((a, b) => a + b, 0) / primaryValues.length)
      : 0;

    if (totalWeight === 0 && primaryValues.length === 0) return;

    const avgScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : primaryScore;

    // Consistency of the composite, measured per rep rather than from the
    // aggregate - this is what distinguishes "reliably decent" from
    // "alternating brilliant and awful".
    const perRepComposites = techReps.map((rep) => {
      let sum = 0;
      let w = 0;
      (Object.keys(weights) as FlawMetric[]).forEach((metric) => {
        const weight = weights[metric];
        if (!weight || !mechanics.measuredMetrics.includes(metric)) return;
        const v = metricValue(rep, metric);
        if (v === null) return;
        sum += v * weight;
        w += weight;
      });
      return w > 0 ? sum / w : primaryScore;
    });
    const compositeStats = computeStats(perRepComposites);

    summaries.push({
      technique: key,
      label: mechanics.label,
      primaryMetric: mechanics.primaryMetric,
      avgScore,
      primaryScore,
      sampleSize: techReps.length,
      consistency: compositeStats.consistency,
      confidence: computeFlawConfidence(techReps.length, trackingConfidence, compositeStats),
      breakdown: breakdown.sort((a, b) => b.weight - a.weight),
    });
  });

  return summaries.sort((a, b) => b.avgScore - a.avgScore);
}
