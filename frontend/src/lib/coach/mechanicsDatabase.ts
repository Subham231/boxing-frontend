// ---------------------------------------------------------------------------
// Pre-built boxing mechanics database.
//
// This is the "trusted measurements" layer described in the coaching-engine
// spec: a deterministic, explainable table of what GOOD technique looks like
// for each move, and what specific, evidenced flaws to flag when a session's
// measured averages fall short. Nothing in here is invented per-session —
// the flaw engine (flawEngine.ts) only ever fires a rule when the real
// aggregated metric from repLog crosses that rule's threshold, and every
// firing carries the measured value as evidence.
//
// Metric names match the score fields already produced by the live capture
// loop in vision/page.tsx (0-100 scale unless noted). Adding a technique or
// a flaw rule here does NOT require touching the live detection/state
// machine — this table is only consulted after a session ends, to interpret
// numbers that are already being measured.
// ---------------------------------------------------------------------------

export type TechniqueKey =
  | 'JAB'
  | 'CROSS'
  | 'HOOK'
  | 'UPPERCUT'
  | 'SLIP_LEFT'
  | 'SLIP_RIGHT'
  | 'ROLL_UNDER';

export type FlawMetric =
  | 'hipRotationScore'
  | 'torsoRotationScore'
  | 'kneeDriveScore'
  | 'weightTransferScore'
  | 'footPivotScore'
  | 'headLateralScore'
  | 'headDropScore'
  | 'estimatedPower'
  | 'trajectoryMatchRate'
  // --- Metrics added with the guard/hand/sequencing tracking layer -------
  // Each of these is only listed in a technique's `measuredMetrics` when
  // the capture path genuinely produces it, so a device that fell back to
  // pose-only tracking (no hand model) never gets graded on wrist
  // alignment it couldn't see. See flawEngine's availability filter.
  | 'guardRecoveryScore'   // did the punching hand snap back to guard
  | 'guardIntegrityScore'  // did the OFF hand stay up while punching
  | 'wristAlignmentScore'  // fist in line with forearm at impact (needs hands)
  | 'sequenceScore'        // proximal-to-distal kinetic chain ordering
  | 'recoverySpeedScore';  // how fast the retraction was

export type Severity = 'minor' | 'moderate' | 'major';

// ---------------------------------------------------------------------------
// Root causes
//
// Boxing faults are heavily correlated: low hip rotation, low weight
// transfer and a flat rear foot on the same sloppy cross are not three
// independent problems, they are three symptoms of one — the lower body
// isn't driving the punch. Reporting them separately reads as "everything
// is wrong" and buries the one correction that would fix all three.
// ---------------------------------------------------------------------------
export type RootCauseKey =
  | 'lower_body_disengaged'
  | 'arm_dominant_chain'
  | 'no_rotation'
  | 'poor_recovery'
  | 'shallow_defense'
  | 'wrong_shape';

export interface RootCauseInfo {
  label: string;
  /** The one correction that addresses the whole cluster. */
  primaryFix: string;
  drill: string;
}

export const ROOT_CAUSES: Record<RootCauseKey, RootCauseInfo> = {
  lower_body_disengaged: {
    label: 'Lower body is not driving the punch',
    primaryFix:
      'Start every power punch from the ground: turn the rear foot, let the hip follow, and only then extend the arm.',
    drill: 'Hip-Lead Sequencing Drill (slow cross, foot and hip first, arm last)',
  },
  arm_dominant_chain: {
    label: 'Punches are firing arm-first',
    primaryFix:
      'Your arm is reaching peak speed before your hips do. Slow the punch down until you can feel the hip lead, then rebuild speed.',
    drill: 'Proximal-to-Distal Tempo Drill (3-count: foot, hip, hand)',
  },
  no_rotation: {
    label: 'Torso is staying square',
    primaryFix: 'Turn your torso through the shot instead of pushing the arm around a static body.',
    drill: 'Arms-Locked Pivot Reps',
  },
  poor_recovery: {
    label: 'Hands are not returning to guard',
    primaryFix:
      'Treat the retraction as part of the punch — snap the hand back along the same line it went out.',
    drill: 'Out-and-Back Snap Drill (count the return, not the throw)',
  },
  shallow_defense: {
    label: 'Defensive movement is too shallow',
    primaryFix: 'Move your head with your legs, not your neck — sink and shift, don’t lean.',
    drill: 'Slip-Rope / Bob-and-Weave Under-the-Line Drill',
  },
  wrong_shape: {
    label: 'Punch shape does not match the call',
    primaryFix:
      'Exaggerate the difference between shapes at slow speed until each one has its own distinct path.',
    drill: 'Shape Isolation Shadowboxing (10 of each, slow, mirror)',
  },
};

export interface FlawRule {
  id: string;
  metric: FlawMetric;
  // Rule fires when the session average for `metric` is below (or above,
  // for metrics where high = bad) this threshold.
  comparator: 'below' | 'above';
  threshold: number;
  severity: Severity;
  // Spread (in metric units) treated as "one full severity step" away from
  // target, used to normalize deviation across metrics that don't share a
  // scale. Without it, ranking compared raw distances-from-threshold: a
  // trajectory-match rule sitting 18 points below its threshold always
  // outranked a rotation rule sitting 7 points below its own, even when the
  // rotation deficit was by far the bigger technical problem. Defaults to
  // 25 when omitted.
  acceptableRange?: number;
  // Optional grouping key. Flaws sharing a rootCause are collapsed into one
  // diagnosis with contributing indicators, instead of being reported as
  // several independent problems — see groupByRootCause in flawEngine.
  rootCause?: RootCauseKey;
  cause: string;
  coachingTip: string;
  correctiveExercise: string;
  recommendedFrequency: string;
  progressionTarget: string;
}

export interface TechniqueMechanics {
  label: string;
  kind: 'punch' | 'defense';
  expectedTrajectory?: 'straight' | 'hook' | 'uppercut';
  // Target score (0-100) for each metric that is actually relevant to this
  // technique — e.g. a jab isn't expected to show much hip rotation, so it
  // isn't scored against that target at all (undefined = not applicable).
  targets: Partial<Record<FlawMetric, number>>;
  // The metric that most defines this technique. Previously the engine
  // inferred this as `Object.keys(targets)[0]`, which silently depended on
  // object key ordering — reordering two lines in this file would change
  // which metric a technique was judged on, with no error anywhere.
  // Declaring it explicitly removes that trap.
  primaryMetric: FlawMetric;
  // Weights for the composite technique score. A technique's quality is not
  // one metric: a cross with perfect hip rotation and no weight transfer is
  // not a good cross. Weights need not sum to 1 — they're normalized over
  // whichever metrics were actually measured this session, so a device with
  // no hand tracking simply redistributes those weights across the rest
  // instead of scoring a zero it never measured.
  scoreWeights: Partial<Record<FlawMetric, number>>;
  // Every metric this technique's live capture path genuinely measures.
  // The flaw engine (flawEngine.ts) refuses to evaluate any rule whose
  // metric isn't listed here — this is what stops a rule from firing
  // against a signal that was never actually tracked for this technique
  // (e.g. kneeDriveScore used to silently sit at 0 for every defensive
  // move because only the punch state machine ever updated it, which made
  // the "no leg bend" roll flaw fire on every single roll regardless of
  // real form). Keep this in sync with what vision/page.tsx's registerHit
  // actually computes for this technique's `kind`.
  measuredMetrics: FlawMetric[];
  flaws: FlawRule[];
}

// What registerHit() in vision/page.tsx genuinely measures per rep kind.
// Head lateral/drop are computed unconditionally in the pose loop but are
// only meaningful for defense reps (a punch shows ~0 head movement by
// construction, not because it was actually scored on head quality); knee
// drive is now measured independently for both kinds (see
// peakDefenseKneeDriveRef in vision/page.tsx), so a roll gets a real
// knee-drive reading rather than the punch-only tracker's stale 0.
const PUNCH_MEASURED_METRICS: FlawMetric[] = [
  'torsoRotationScore',
  'hipRotationScore',
  'kneeDriveScore',
  'weightTransferScore',
  'footPivotScore',
  'estimatedPower',
  'trajectoryMatchRate',
  // Always measured from pose alone (wrist travel back toward the guard
  // baseline), so these are safe to list unconditionally.
  'guardRecoveryScore',
  'guardIntegrityScore',
  'recoverySpeedScore',
  'sequenceScore',
];

// Requires the hand-landmark model. The flaw engine filters these out
// automatically when a rep reports no hand data (see repHasMetric), so a
// low-tier device that dropped hand tracking is never graded on them.
const HAND_DEPENDENT_METRICS: FlawMetric[] = ['wristAlignmentScore'];
const DEFENSE_MEASURED_METRICS: FlawMetric[] = [
  'headLateralScore',
  'headDropScore',
  'kneeDriveScore',
  'guardIntegrityScore', // hands must stay up while slipping/rolling
];


// ---------------------------------------------------------------------------
// Rules that apply to every punch regardless of which one was thrown.
//
// These grade the half of a punch the pipeline previously never looked at:
// the return. A fighter who throws fast and leaves the hand out is a worse
// fighter than one who throws slightly slower and recovers — but the old
// scoring literally could not tell them apart.
// ---------------------------------------------------------------------------
const PUNCH_COMMON_FLAWS: FlawRule[] = [
  {
    id: 'punch_no_guard_return',
    metric: 'guardRecoveryScore',
    rootCause: 'poor_recovery',
    acceptableRange: 25,
    comparator: 'below',
    threshold: 40,
    severity: 'major',
    cause: 'The punching hand is not coming back to guard after the shot — it is being left out in front of you.',
    coachingTip: 'Pull the hand back along the same line it went out, as fast as you threw it.',
    correctiveExercise: 'Out-and-Back Snap Drill (count only the return)',
    recommendedFrequency: '4 sets x 15 reps, 4x/week',
    progressionTarget: 'Guard recovery 65%+ on 8/10 punches',
  },
  {
    id: 'punch_slow_recovery',
    metric: 'recoverySpeedScore',
    rootCause: 'poor_recovery',
    acceptableRange: 25,
    comparator: 'below',
    threshold: 35,
    severity: 'moderate',
    cause: 'The hand does return, but slowly — the retraction is being lowered rather than snapped back.',
    coachingTip: 'Think of the punch as a whip: the return should be as sharp as the throw.',
    correctiveExercise: 'Elastic-Band Retraction Drill',
    recommendedFrequency: '3 sets x 20 reps, 3x/week',
    progressionTarget: 'Retraction under 300ms on 8/10 punches',
  },
  {
    id: 'punch_guard_drops',
    metric: 'guardIntegrityScore',
    rootCause: 'poor_recovery',
    acceptableRange: 25,
    comparator: 'below',
    threshold: 45,
    severity: 'major',
    cause: 'The non-punching hand drops away from the face while you throw, leaving you open to the counter.',
    coachingTip: 'Glue the off hand to your cheek — it should not move at all while the other arm works.',
    correctiveExercise: 'Anchored Off-Hand Shadowboxing (off glove touching temple)',
    recommendedFrequency: '3 rounds x 2 min, 4x/week',
    progressionTarget: 'Guard integrity 70%+ across a full round',
  },
  {
    id: 'punch_arm_dominant',
    metric: 'sequenceScore',
    rootCause: 'arm_dominant_chain',
    acceptableRange: 30,
    comparator: 'below',
    threshold: 45,
    severity: 'major',
    cause: 'The arm is reaching peak speed before the hips do — the punch is being thrown from the shoulder with no kinetic chain behind it.',
    coachingTip: 'Foot, hip, then hand. If the hand moves first, the punch has no power source.',
    correctiveExercise: 'Proximal-to-Distal Tempo Drill (3-count)',
    recommendedFrequency: '4 sets x 10 slow reps, 4x/week',
    progressionTarget: 'Sequence score 70%+ on 8/10 power punches',
  },
  {
    id: 'punch_wrist_collapse',
    metric: 'wristAlignmentScore',
    rootCause: 'arm_dominant_chain',
    acceptableRange: 25,
    comparator: 'below',
    threshold: 40,
    severity: 'moderate',
    cause: 'The wrist is bending at impact instead of staying in line with the forearm — this leaks power and is how wrists get injured.',
    coachingTip: 'Keep a straight line from elbow through wrist to knuckles at the moment of contact.',
    correctiveExercise: 'Wrist-Lock Isometric Holds + slow bag contact reps',
    recommendedFrequency: '3 sets x 30s holds, 4x/week',
    progressionTarget: 'Wrist alignment 70%+ on 8/10 punches',
  },
];

// Defensive movement should never cost you your guard.
const DEFENSE_COMMON_FLAWS: FlawRule[] = [
  {
    id: 'defense_guard_drops',
    metric: 'guardIntegrityScore',
    rootCause: 'shallow_defense',
    acceptableRange: 25,
    comparator: 'below',
    threshold: 45,
    severity: 'moderate',
    cause: 'Your hands drop as you move your head — slipping into a position with no guard up is not a defence.',
    coachingTip: 'Move your head behind your gloves, not out from behind them.',
    correctiveExercise: 'Guard-Locked Slip Drill (hands fixed to temples)',
    recommendedFrequency: '3 rounds x 2 min, 3x/week',
    progressionTarget: 'Guard integrity 70%+ on every defensive rep',
  },
];

export const MECHANICS_DATABASE: Record<TechniqueKey, TechniqueMechanics> = {
  JAB: {
    label: 'Jab',
    kind: 'punch',
    expectedTrajectory: 'straight',
    targets: {
      torsoRotationScore: 25, // a jab is mostly lead-arm extension, not a full pivot
      footPivotScore: 15,
      estimatedPower: 45,
    },
    primaryMetric: 'estimatedPower',
    scoreWeights: {
      estimatedPower: 0.3,
      trajectoryMatchRate: 0.2,
      torsoRotationScore: 0.15,
      guardRecoveryScore: 0.25,
      wristAlignmentScore: 0.1,
    },
    measuredMetrics: [...PUNCH_MEASURED_METRICS, ...HAND_DEPENDENT_METRICS],
    flaws: [
      ...PUNCH_COMMON_FLAWS,
      {
        id: 'jab_low_power',
        metric: 'estimatedPower',
        rootCause: 'arm_dominant_chain',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 30,
        severity: 'moderate',
        cause: 'Lead arm is pushing out instead of snapping — extension speed is low relative to a real jab.',
        coachingTip: 'Snap the jab out and back — think "flick", not "push".',
        correctiveExercise: 'Jab Speed Snap Drill',
        recommendedFrequency: '3 sets x 20 reps, 3x/week',
        progressionTarget: 'Reach 50%+ estimated power on 8/10 jabs',
      },
      {
        id: 'jab_wrong_shape',
        metric: 'trajectoryMatchRate',
        rootCause: 'wrong_shape',
        acceptableRange: 30,
        comparator: 'below',
        threshold: 60,
        severity: 'minor',
        cause: 'Wrist path is drifting off a straight line — the jab is looping out instead of shooting straight.',
        coachingTip: 'Picture a straight line from your chin to the target — travel that line, out and back.',
        correctiveExercise: 'Straight-Line Jab Drill (shadow box facing a wall/mirror)',
        recommendedFrequency: '2 sets x 15 reps, 3x/week',
        progressionTarget: '80%+ trajectory match on called jabs',
      },
    ],
  },

  CROSS: {
    label: 'Cross',
    kind: 'punch',
    expectedTrajectory: 'straight',
    targets: {
      hipRotationScore: 55,
      torsoRotationScore: 55,
      footPivotScore: 40,
      weightTransferScore: 45,
      estimatedPower: 55,
    },
    primaryMetric: 'hipRotationScore',
    scoreWeights: {
      hipRotationScore: 0.25,
      weightTransferScore: 0.2,
      footPivotScore: 0.15,
      estimatedPower: 0.15,
      sequenceScore: 0.15,
      guardRecoveryScore: 0.1,
    },
    measuredMetrics: [...PUNCH_MEASURED_METRICS, ...HAND_DEPENDENT_METRICS],
    flaws: [
      ...PUNCH_COMMON_FLAWS,
      {
        id: 'cross_low_hip_rotation',
        metric: 'hipRotationScore',
        rootCause: 'lower_body_disengaged',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 35,
        severity: 'major',
        cause: 'Rear hip is not turning through the punch — power is coming from the shoulder/arm alone.',
        coachingTip: 'Rotate your rear hip through the punch, not just your shoulder.',
        correctiveExercise: 'Hip Rotation Drill (slow-motion cross, hip-lead)',
        recommendedFrequency: '4 sets x 15 reps, 4x/week',
        progressionTarget: 'Hip rotation score 55%+ on 8/10 crosses',
      },
      {
        id: 'cross_low_pivot',
        metric: 'footPivotScore',
        rootCause: 'lower_body_disengaged',
        acceptableRange: 20,
        comparator: 'below',
        threshold: 25,
        severity: 'moderate',
        cause: 'Rear foot is staying flat — without the heel turning, the hips can\u2019t fully open into the punch.',
        coachingTip: 'Let your rear heel rotate outward as you throw — pivot, don\u2019t plant.',
        correctiveExercise: 'Rear Foot Pivot Drill',
        recommendedFrequency: '3 sets x 15 reps, 3x/week',
        progressionTarget: 'Foot pivot score 40%+ on 8/10 crosses',
      },
      {
        id: 'cross_low_weight_transfer',
        metric: 'weightTransferScore',
        rootCause: 'lower_body_disengaged',
        acceptableRange: 20,
        comparator: 'below',
        threshold: 25,
        severity: 'moderate',
        cause: 'Weight is staying centered/back instead of driving forward into the strike.',
        coachingTip: 'Shift your weight forward and across into the cross — step into it, not just reach.',
        correctiveExercise: 'Weight Transfer Cross Drill',
        recommendedFrequency: '3 sets x 15 reps, 3x/week',
        progressionTarget: 'Weight transfer score 45%+ on 8/10 crosses',
      },
    ],
  },

  HOOK: {
    label: 'Hook',
    kind: 'punch',
    expectedTrajectory: 'hook',
    targets: {
      torsoRotationScore: 60,
      hipRotationScore: 45,
      footPivotScore: 35,
      estimatedPower: 55,
    },
    primaryMetric: 'torsoRotationScore',
    scoreWeights: {
      torsoRotationScore: 0.3,
      hipRotationScore: 0.2,
      trajectoryMatchRate: 0.2,
      footPivotScore: 0.15,
      guardRecoveryScore: 0.15,
    },
    measuredMetrics: [...PUNCH_MEASURED_METRICS, ...HAND_DEPENDENT_METRICS],
    flaws: [
      ...PUNCH_COMMON_FLAWS,
      {
        id: 'hook_low_torso_rotation',
        metric: 'torsoRotationScore',
        rootCause: 'no_rotation',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 40,
        severity: 'major',
        cause: 'Shoulders are barely turning — the hook is being thrown with the arm swinging around the body instead of the torso rotating through it.',
        coachingTip: 'Turn your whole torso into the hook — the arm is just along for the ride.',
        correctiveExercise: 'Torso Rotation Hook Drill (arms-locked pivot reps)',
        recommendedFrequency: '4 sets x 12 reps, 4x/week',
        progressionTarget: 'Torso rotation score 60%+ on 8/10 hooks',
      },
      {
        id: 'hook_wrong_shape',
        metric: 'trajectoryMatchRate',
        rootCause: 'wrong_shape',
        acceptableRange: 30,
        comparator: 'below',
        threshold: 55,
        severity: 'moderate',
        cause: 'Wrist path is too straight/short to register as a real circular hook path.',
        coachingTip: 'Keep the elbow bent near 90\u00b0 and sweep it around, not straight out.',
        correctiveExercise: 'Elbow-Angle Hook Shadowboxing',
        recommendedFrequency: '3 sets x 15 reps, 3x/week',
        progressionTarget: '75%+ trajectory match on called hooks',
      },
    ],
  },

  UPPERCUT: {
    label: 'Uppercut',
    kind: 'punch',
    expectedTrajectory: 'uppercut',
    targets: {
      kneeDriveScore: 55,
      hipRotationScore: 40,
      weightTransferScore: 35,
      estimatedPower: 55,
    },
    primaryMetric: 'kneeDriveScore',
    scoreWeights: {
      kneeDriveScore: 0.3,
      hipRotationScore: 0.2,
      weightTransferScore: 0.2,
      estimatedPower: 0.15,
      guardRecoveryScore: 0.15,
    },
    measuredMetrics: [...PUNCH_MEASURED_METRICS, ...HAND_DEPENDENT_METRICS],
    flaws: [
      ...PUNCH_COMMON_FLAWS,
      {
        id: 'uppercut_low_knee_drive',
        metric: 'kneeDriveScore',
        rootCause: 'lower_body_disengaged',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 35,
        severity: 'major',
        cause: 'Legs are staying straight through the punch — the uppercut has no leg drive underneath it, so it\u2019s an arm-only lift.',
        coachingTip: 'Bend your knees and drive up through your legs as you throw the uppercut.',
        correctiveExercise: 'Leg-Drive Uppercut Drill (dip-and-drive reps)',
        recommendedFrequency: '4 sets x 12 reps, 4x/week',
        progressionTarget: 'Knee drive score 55%+ on 8/10 uppercuts',
      },
      {
        id: 'uppercut_low_hip_extension',
        metric: 'hipRotationScore',
        rootCause: 'lower_body_disengaged',
        acceptableRange: 20,
        comparator: 'below',
        threshold: 25,
        severity: 'moderate',
        cause: 'Hips aren\u2019t extending/rotating upward with the legs, so leg drive isn\u2019t transferring into the fist.',
        coachingTip: 'Let your hip snap forward and up as your leg drives — don\u2019t just lift the arm.',
        correctiveExercise: 'Hip-Extension Uppercut Drill',
        recommendedFrequency: '3 sets x 15 reps, 3x/week',
        progressionTarget: 'Hip rotation score 40%+ on 8/10 uppercuts',
      },
    ],
  },

  SLIP_LEFT: {
    label: 'Slip Left',
    kind: 'defense',
    targets: {
      headLateralScore: 55,
    },
    primaryMetric: 'headLateralScore',
    scoreWeights: {
      headLateralScore: 0.6,
      kneeDriveScore: 0.2,
      guardIntegrityScore: 0.2,
    },
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      ...DEFENSE_COMMON_FLAWS,
      {
        id: 'slip_shallow',
        metric: 'headLateralScore',
        rootCause: 'shallow_defense',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 30,
        severity: 'moderate',
        cause: 'Head is barely moving off the centerline — a shallow slip still leaves you in the pocket.',
        coachingTip: 'Bend at the knees and waist to really move your head off the centerline, not just tilt it.',
        correctiveExercise: 'Slip Bag Drill (both directions)',
        recommendedFrequency: '3 sets x 10 reps each side, 3x/week',
        progressionTarget: 'Head lateral score 55%+ on 8/10 slips',
      },
    ],
  },

  SLIP_RIGHT: {
    label: 'Slip Right',
    kind: 'defense',
    targets: {
      headLateralScore: 55,
    },
    primaryMetric: 'headLateralScore',
    scoreWeights: {
      headLateralScore: 0.6,
      kneeDriveScore: 0.2,
      guardIntegrityScore: 0.2,
    },
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      ...DEFENSE_COMMON_FLAWS,
      {
        id: 'slip_shallow',
        metric: 'headLateralScore',
        rootCause: 'shallow_defense',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 30,
        severity: 'moderate',
        cause: 'Head is barely moving off the centerline — a shallow slip still leaves you in the pocket.',
        coachingTip: 'Bend at the knees and waist to really move your head off the centerline, not just tilt it.',
        correctiveExercise: 'Slip Bag Drill (both directions)',
        recommendedFrequency: '3 sets x 10 reps each side, 3x/week',
        progressionTarget: 'Head lateral score 55%+ on 8/10 slips',
      },
    ],
  },

  ROLL_UNDER: {
    label: 'Roll / Bob & Weave',
    kind: 'defense',
    targets: {
      headDropScore: 50,
      kneeDriveScore: 30,
    },
    primaryMetric: 'headDropScore',
    scoreWeights: {
      headDropScore: 0.5,
      kneeDriveScore: 0.3,
      guardIntegrityScore: 0.2,
    },
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      ...DEFENSE_COMMON_FLAWS,
      {
        id: 'roll_shallow',
        metric: 'headDropScore',
        rootCause: 'shallow_defense',
        acceptableRange: 25,
        comparator: 'below',
        threshold: 25,
        severity: 'major',
        cause: 'Head is dropping barely at all — not enough vertical movement to actually roll under a shot.',
        coachingTip: 'Bend your knees and duck your head well below shoulder height as you roll.',
        correctiveExercise: 'Bob-and-Weave Under-the-Rope Drill',
        recommendedFrequency: '4 sets x 10 reps, 3x/week',
        progressionTarget: 'Head drop score 50%+ on 8/10 rolls',
      },
      {
        id: 'roll_no_leg_bend',
        metric: 'kneeDriveScore',
        rootCause: 'shallow_defense',
        acceptableRange: 15,
        comparator: 'below',
        threshold: 15,
        severity: 'minor',
        cause: 'Roll is coming purely from the waist/neck, with little knee bend — that\u2019s slower and less stable than dropping through the legs.',
        coachingTip: 'Sink through your knees as you roll, don\u2019t just bend at the waist.',
        correctiveExercise: 'Squat-Roll Combo Drill',
        recommendedFrequency: '3 sets x 10 reps, 2x/week',
        progressionTarget: 'Consistent knee bend on every roll',
      },
    ],
  },
};

export function techniqueKeyForCommand(command: string): TechniqueKey | null {
  // Underscores/extra whitespace are normalized to single spaces so both
  // 'LEAD_HOOK' and 'LEAD HOOK' resolve to the same technique.
  const normalized = command.trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  switch (normalized) {
    case 'JAB': return 'JAB';
    case 'CROSS': return 'CROSS';
    case 'HOOK': return 'HOOK';
    case 'UPPERCUT': return 'UPPERCUT';
    case 'SLIP LEFT': return 'SLIP_LEFT';
    case 'SLIP RIGHT': return 'SLIP_RIGHT';
    case 'ROLL UNDER': return 'ROLL_UNDER';
    default: break;
  }

  // Variant labels that appear elsewhere in the app (the speech map in
  // vision/page.tsx already voices LEAD HOOK / REAR UPPERCUT / BODY HOOK
  // etc.). Without these aliases every such rep resolved to null, was
  // dropped from BOTH evaluateSessionFlaws() and summarizeTechniques(), and
  // so contributed nothing to the strongest/weakest readout — which is one
  // of the ways that panel came back empty. Variants are scored against
  // their base technique's mechanics, which is the correct standard for
  // them; a lead/rear distinction doesn't change the required mechanics.
  if (normalized.endsWith('UPPERCUT') || normalized.startsWith('UPPERCUT')) return 'UPPERCUT';
  if (normalized.endsWith('HOOK') || normalized.startsWith('HOOK')) return 'HOOK';
  if (normalized.includes('JAB')) return 'JAB';
  if (normalized.includes('CROSS') || normalized.includes('OVERHAND')) return 'CROSS';
  if (normalized.includes('SLIP')) {
    if (normalized.includes('RIGHT')) return 'SLIP_RIGHT';
    if (normalized.includes('LEFT')) return 'SLIP_LEFT';
  }
  if (normalized.includes('ROLL') || normalized.includes('WEAVE')) return 'ROLL_UNDER';
  return null;
}

// Freestyle mode has no called command — classify purely from the measured
// trajectory shape so freestyle punches still get technique-specific flaws.
export function techniqueKeyForTrajectory(trajectory: 'straight' | 'hook' | 'uppercut'): TechniqueKey {
  if (trajectory === 'hook') return 'HOOK';
  if (trajectory === 'uppercut') return 'UPPERCUT';
  return 'CROSS'; // straight freestyle punch — score against the fuller (cross) standard, not the lighter jab one
}
