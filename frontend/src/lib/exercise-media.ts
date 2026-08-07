// Shared name -> real reference video lookup for Daily Grind drills.
// Drill names arrive as free-form strings from several different sources
// (the static bodyweight/boxing pools in workout-data.ts, planner protocol
// blocks, legacy localStorage-deployed drills, tactical sessions) so this
// matches by keyword rather than requiring every call site to attach a
// videoUrl itself. Used as a fallback inside ExerciseVisualGuide — an
// explicit videoUrl prop always wins over this lookup.
//
// Only exercises we actually have real footage for are listed here. Every
// pattern is checked in order and the first match wins, so more specific
// patterns are listed before more general ones (e.g. "jump squat" before
// "squat").
const EXERCISE_VIDEO_RULES: Array<[RegExp, string]> = [
  // Bodyweight — legs
  [/jump squat/i, '/exercises/jump-squats.mp4'],
  [/wall sit/i, '/exercises/wall-sit.mp4'],
  [/\bsquat/i, '/exercises/squats.mp4'],

  // Bodyweight — push/chest
  [/diamond push/i, '/exercises/diamond-pushups.mp4'],
  [/pike push/i, '/exercises/pike-pushups.mp4'],
  [/explosive push/i, '/exercises/explosive-pushups.mp4'],

  // Bodyweight — core
  [/bicycle crunch/i, '/exercises/bicycle-crunch.mp4'],
  [/mountain climber/i, '/exercises/mountain-climbers.mp4'],
  [/hollow hold/i, '/exercises/hollow-hold.mp4'],
  [/\bplank/i, '/exercises/plank.mp4'],

  // Bodyweight — back
  [/superman/i, '/exercises/superman-hold.mp4'],
  [/reverse snow angel/i, '/exercises/reverse-snow-angels.mp4'],
  [/bird[\s-]?dog/i, '/exercises/bird-dog.mp4'],
  [/back extension/i, '/exercises/back-extension.mp4'],

  // Boxing routine drills — reuse the Guru technique reference clips
  [/slip\s*&?\s*roll/i, '/guru/moves/slip.mp4'],
  [/bob\s*&?\s*weave/i, '/guru/moves/slip.mp4'],
  [/roundhouse/i, '/guru/moves/roundhouse-kick.mp4'],
  [/teep/i, '/guru/moves/teep-kick.mp4'],
  [/knee strike/i, '/guru/moves/kneestrike.mp4'],
  [/check\s*&?\s*counter/i, '/guru/moves/hook.mp4'],
  [/pivot\s*&?\s*angle/i, '/guru/moves/slip.mp4'],
  [/shadowbox/i, '/guru/moves/jab.mp4'],
];

export function getExerciseVideoUrl(name: string): string | undefined {
  for (const [pattern, url] of EXERCISE_VIDEO_RULES) {
    if (pattern.test(name)) return url;
  }
  return undefined;
}
