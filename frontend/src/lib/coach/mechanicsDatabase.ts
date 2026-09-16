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
  | 'trajectoryMatchRate';

export type Severity = 'minor' | 'moderate' | 'major';

export interface FlawRule {
  id: string;
  metric: FlawMetric;
  // Rule fires when the session average for `metric` is below (or above,
  // for metrics where high = bad) this threshold.
  comparator: 'below' | 'above';
  threshold: number;
  severity: Severity;
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
];
const DEFENSE_MEASURED_METRICS: FlawMetric[] = [
  'headLateralScore',
  'headDropScore',
  'kneeDriveScore',
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
    measuredMetrics: PUNCH_MEASURED_METRICS,
    flaws: [
      {
        id: 'jab_low_power',
        metric: 'estimatedPower',
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
    measuredMetrics: PUNCH_MEASURED_METRICS,
    flaws: [
      {
        id: 'cross_low_hip_rotation',
        metric: 'hipRotationScore',
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
    measuredMetrics: PUNCH_MEASURED_METRICS,
    flaws: [
      {
        id: 'hook_low_torso_rotation',
        metric: 'torsoRotationScore',
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
    measuredMetrics: PUNCH_MEASURED_METRICS,
    flaws: [
      {
        id: 'uppercut_low_knee_drive',
        metric: 'kneeDriveScore',
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
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      {
        id: 'slip_shallow',
        metric: 'headLateralScore',
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
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      {
        id: 'slip_shallow',
        metric: 'headLateralScore',
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
    measuredMetrics: DEFENSE_MEASURED_METRICS,
    flaws: [
      {
        id: 'roll_shallow',
        metric: 'headDropScore',
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
