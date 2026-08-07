import { Technique } from '@/types';

export interface TechniqueStat {
  label: string;
  val: string;
}

// Standardized 0-100 rating across EVERY skill, replacing the old single
// arbitrary "score" field (which produced nonsense like a stance being
// "25% effective"). Every technique gets a rating on every attribute so
// comparisons are consistent and logically balanced.
export interface TechniqueMetrics {
  offense: number;           // Offensive Effectiveness
  defense: number;           // Defensive Value
  difficulty: number;        // Difficulty Level (higher = harder to learn)
  energy: number;            // Energy Requirement (higher = more taxing)
  learningCurve: number;     // Learning Curve (higher = takes longer to feel natural)
  fightApplicability: number;// Fight Applicability
  counterPotential: number;  // Counter Potential
  versatility: number;       // Versatility
  speedRequirement: number;  // Speed Requirement
  timingPrecision: number;   // Timing Precision required
}

export interface DrillRecommendation {
  name: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string;
  benefit: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TechniqueDetail extends Technique {
  subtitle: string;
  image: string;
  videoUrl?: string; // real reference footage, when we have it — falls back to `image` when absent
  score: number; // legacy field, kept for backward compatibility with old callers
  stats: TechniqueStat[];
  metrics: TechniqueMetrics;
  mistakes?: string[];
  pro_tip?: string;
  targets?: string[];
  isAiPick?: boolean;
  whyImportant?: string;
  whenToUse?: string;
  bestFor?: string[];
  advantages?: string[];
  weaknesses?: string[];
  variations?: string[];
  relatedIds?: string[];
  drills?: DrillRecommendation[];
  quiz?: QuizQuestion[];
}

// Average of the 10 metrics — used anywhere a single summary number is
// still useful (sorting, "skill of the day" weighting), but never shown to
// the user as a bare "% effective" figure anymore.
export function overallRating(m: TechniqueMetrics): number {
  const vals = [m.offense, m.defense, m.fightApplicability, m.counterPotential, m.versatility];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function allTechniques(): TechniqueDetail[] {
  return Object.values(techniquesData).flat();
}

export function getTechniqueById(id: string): TechniqueDetail | undefined {
  return allTechniques().find((t) => t.id === id);
}

export function getCategoryOf(id: string): string | undefined {
  for (const [category, list] of Object.entries(techniquesData)) {
    if (list.some((t) => t.id === id)) return category;
  }
  return undefined;
}
export const techniquesData: Record<'stances' | 'punches' | 'kicks' | 'defense' | string, TechniqueDetail[]> = {
  stances: [
    {
      id: "orthodox",
      name: "Orthodox",
      subtitle: "Standard Foundation",
      image: "/guru/images/orthodox.jpg",
      videoUrl: "/guru/moves/standing-position.mp4",
      score: 82,
      description: "The foundation of all combat movement. Proper stance ensures balance for lateral movement and stability for power shots.",
      whyImportant: "Every punch, slip, and pivot you'll ever throw is built on top of your stance. A weak stance quietly sabotages everything else you learn.",
      whenToUse: "Always — this is your default, resting position between exchanges, not a technique you 'use' situationally.",
      steps: [
        "Lead foot (Left) forward, pointing at 1 o'clock.",
        "Rear foot (Right) back at 4 o'clock, heel slightly raised.",
        "Hands high: Left at cheek, Right protecting chin.",
        "Chin tucked toward lead shoulder, eyes up.",
        "Knees soft, weight balanced roughly 50/50."
      ],
      tips: [
        "Keep your chin tucked behind your lead shoulder at all times.",
        "Weight should be balanced — if you can be pushed over easily, you're too far forward or back.",
        "Relax your shoulders; a tense stance tires you out before the round even starts."
      ],
      category: "stances",
      stats: [
        { label: "BALANCE", val: "95%" },
        { label: "MOBILITY", val: "85%" },
        { label: "STABILITY", val: "90%" }
      ],
      metrics: {
        offense: 70, defense: 80, difficulty: 25, energy: 20,
        learningCurve: 20, fightApplicability: 100, counterPotential: 65,
        versatility: 95, speedRequirement: 30, timingPrecision: 30
      },
      mistakes: ["Squaring the shoulders too much, exposing the chin.", "Weight too far forward, killing mobility.", "Hands dropping over time as fatigue sets in."],
      pro_tip: "Your stance should feel athletic, like you're about to jump — not stiff like you're standing at attention.",
      bestFor: ["Default ready position", "Setting up every offensive and defensive action", "Beginners establishing fundamentals"],
      advantages: ["Balanced for both offense and defense", "Natural power generation for the rear hand", "Easiest stance to teach and drill"],
      weaknesses: ["Rear hand travels a longer distance than in southpaw mirror-matches", "Predictable if never varied"],
      variations: ["Philly Shell (low lead hand, shoulder roll defense)", "Peek-a-boo (high guard, bouncing rhythm)"],
      relatedIds: ["southpaw", "jab", "cross"],
      drills: [
        { name: "Mirror Stance Check", duration: "5 min", difficulty: "Beginner", equipment: "None", benefit: "Builds muscle memory for correct alignment" },
        { name: "Balance Push Drill (partner)", duration: "5 min", difficulty: "Beginner", equipment: "Partner", benefit: "Tests and corrects weight distribution" },
        { name: "Shadowboxing in Stance", duration: "10 min", difficulty: "Beginner", equipment: "None", benefit: "Reinforces stance under movement" }
      ],
      quiz: [
        { question: "Where should your chin be positioned in an orthodox stance?", options: ["Up and exposed", "Tucked behind the lead shoulder", "Turned away from opponent", "Resting on the chest"], correctIndex: 1 },
        { question: "What's the main risk of squaring your shoulders?", options: ["Losing power", "Exposing your chin", "Slower jab", "Nothing, it's fine"], correctIndex: 1 }
      ]
    },
    {
      id: "southpaw",
      name: "Southpaw",
      subtitle: "Lefty Configuration",
      image: "/guru/images/southpaw.jpg",
      score: 68,
      description: "The mirror image of Orthodox. Often tricky for opponents to deal with due to the open angle it creates against orthodox fighters.",
      whyImportant: "Understanding southpaw — whether you fight from it or fight against it — is essential since roughly 1 in 10 opponents will use it.",
      whenToUse: "As your primary stance if you're naturally left-handed, or situationally to create awkward angles against an orthodox opponent.",
      steps: [
        "Lead foot (Right) forward at 11 o'clock.",
        "Rear foot (Left) back at 8 o'clock.",
        "Invert Guard: Right hand lead, Left hand rear.",
        "Chin tucked toward lead (right) shoulder.",
        "Same balanced weight distribution as orthodox."
      ],
      tips: [
        "Angle your lead foot outside your opponent's lead foot to control the fight.",
        "Your rear (left) hand is now your power hand — treat it accordingly.",
        "Against orthodox fighters, footwork to your left (their right) opens the most opportunities."
      ],
      category: "stances",
      stats: [
        { label: "BALANCE", val: "80%" },
        { label: "MOBILITY", val: "85%" },
        { label: "ANGLE", val: "99%" }
      ],
      metrics: {
        offense: 70, defense: 78, difficulty: 30, energy: 20,
        learningCurve: 35, fightApplicability: 85, counterPotential: 75,
        versatility: 90, speedRequirement: 30, timingPrecision: 35
      },
      mistakes: ["Fighting an orthodox rhythm instead of using the angle advantage.", "Neglecting lead-foot positioning outside the opponent's stance.", "Switching stances without a clear tactical reason."],
      pro_tip: "The southpaw advantage isn't magic — it comes almost entirely from controlling the outside foot position. Master that first.",
      bestFor: ["Natural left-handed fighters", "Creating awkward angles against orthodox opponents", "Confusing fighters unfamiliar with lefties"],
      advantages: ["Unfamiliar angle for most opponents", "Rear hand (power) lines up outside opponent's guard", "Strong counter opportunities off the lead hand"],
      weaknesses: ["Fewer training partners practice against it, so it can get rusty", "Requires deliberate footwork to maintain the angle advantage"],
      variations: ["Switch-hitting (alternating orthodox/southpaw mid-fight)"],
      relatedIds: ["orthodox", "pivot"],
      drills: [
        { name: "Outside Foot Positioning Drill", duration: "8 min", difficulty: "Intermediate", equipment: "Partner", benefit: "Builds the angle-control habit" },
        { name: "Southpaw Shadowboxing", duration: "10 min", difficulty: "Beginner", equipment: "None", benefit: "Comfort and coordination in the stance" }
      ],
      quiz: [
        { question: "In southpaw, which hand becomes the power hand?", options: ["Right", "Left", "Neither changes", "Both equally"], correctIndex: 1 }
      ]
    }
  ],
  punches: [
    {
      id: "jab",
      name: "The Jab",
      subtitle: "Range Finder (#1)",
      image: "/guru/images/jab.jpg",
      videoUrl: "/guru/moves/jab.mp4",
      score: 88,
      isAiPick: true,
      description: "A straight lead-hand punch. Used for range-finding and setting up power. The 'snapping' motion is key.",
      whyImportant: "The jab sets up nearly everything else — range, rhythm, and openings for power shots all flow from a good jab.",
      whenToUse: "Constantly: to find range, disrupt an opponent's rhythm, set up combinations, or as a defensive stop-hit.",
      steps: [
        "Step in with lead foot to close distance.",
        "Extend lead arm straight, rotating fist at the end.",
        "Snap back immediately to guard position.",
        "Keep rear hand glued to your chin throughout."
      ],
      tips: [
        "Think of your arm like a whip — it's not about pushing weight, it's about speed and tension at the very end of the motion.",
        "Exhale sharply on impact.",
        "Return your hand immediately; a jab that stays out is a jab that gets countered."
      ],
      category: "punches",
      stats: [
        { label: "SPEED", val: "98%" },
        { label: "POWER", val: "45%" },
        { label: "UTILITY", val: "100%" }
      ],
      metrics: {
        offense: 65, defense: 55, difficulty: 20, energy: 25,
        learningCurve: 20, fightApplicability: 100, counterPotential: 60,
        versatility: 100, speedRequirement: 90, timingPrecision: 55
      },
      mistakes: ["Dropping rear hand during extension", "Pushing instead of snapping", "Telegraphing the punch with elbow flare"],
      pro_tip: "Think of your arm like a whip. It's not about pushing weight, it's about speed and tension at the very end of the motion.",
      targets: ["Chin", "Nose", "Solar Plexus"],
      bestFor: ["Range finding", "Setting up combinations", "Counter punching (stop-hit)", "Controlling distance"],
      advantages: ["Fastest punch to throw and retract", "Lowest energy cost per punch", "Hardest to counter cleanly"],
      weaknesses: ["Low knockout power on its own", "Can become predictable if overused without variation"],
      variations: ["Double Jab", "Jab to the body", "Feint Jab", "Step-back Jab (counter)"],
      relatedIds: ["cross", "hook", "orthodox"],
      drills: [
        { name: "Shadowboxing Jab Drill", duration: "5 min", difficulty: "Beginner", equipment: "None", benefit: "Builds snap and retraction speed" },
        { name: "Wall Accuracy Drill", duration: "5 min", difficulty: "Beginner", equipment: "Wall target/tape mark", benefit: "Sharpens precision" },
        { name: "Double Jab Movement Drill", duration: "8 min", difficulty: "Intermediate", equipment: "None", benefit: "Combines jab with footwork" },
        { name: "Heavy Bag Jab Rounds", duration: "3x3 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Builds punch endurance and power transfer" },
        { name: "Reaction Jab Drill", duration: "5 min", difficulty: "Advanced", equipment: "Partner or app cue", benefit: "Sharpens reflex speed" }
      ],
      quiz: [
        { question: "Which hand protects your chin while jabbing?", options: ["Lead hand", "Rear hand", "Neither — both drop", "It doesn't matter"], correctIndex: 1 },
        { question: "What is the jab primarily used for?", options: ["Knockouts", "Range-finding and setups", "Defense only", "Nothing, it's a wasted punch"], correctIndex: 1 }
      ]
    },
    {
      id: "cross",
      name: "The Cross",
      subtitle: "Rear Hand Power (#2)",
      image: "/guru/images/cross.jpg",
      videoUrl: "/guru/moves/cross.mp4",
      score: 75,
      description: "A straight rear-hand punch. High power generated from the rotation of the rear hip and foot.",
      whyImportant: "The cross is usually a fighter's single hardest-hitting straight punch — the classic 1-2 combination's finisher.",
      whenToUse: "After a jab to capitalize on an opening, or as a counter over a lazy jab.",
      steps: [
        "Rotate rear hip and foot ('squish the bug').",
        "Drive rear hand straight down the pipe.",
        "Protect chin with lead shoulder on extension.",
        "Return to guard immediately after impact."
      ],
      tips: [
        "The power comes entirely from the back foot pivoting and the hips rotating — the arm is just a vehicle for that force.",
        "Rotate through the hips, don't just reach with the arm.",
        "Exhale sharply on impact."
      ],
      category: "punches",
      stats: [
        { label: "SPEED", val: "75%" },
        { label: "POWER", val: "92%" },
        { label: "RANGE", val: "85%" }
      ],
      metrics: {
        offense: 90, defense: 45, difficulty: 40, energy: 45,
        learningCurve: 35, fightApplicability: 90, counterPotential: 55,
        versatility: 70, speedRequirement: 65, timingPrecision: 60
      },
      mistakes: ["Squaring up the shoulders", "Reaching too far and losing balance", "Not pivoting the back foot"],
      pro_tip: "The power comes entirely from the back foot pivoting and the hips rotating. The arm is just a vehicle for that force.",
      targets: ["Jaw", "Nose", "Body"],
      bestFor: ["Finishing the 1-2 combination", "Counter punching over a slow jab", "Mid-range power exchanges"],
      advantages: ["Highest power-to-speed ratio among straight punches", "Travels the shortest path to a high-value target"],
      weaknesses: ["Telegraphs more than the jab if hips wind up early", "Leaves the lead side momentarily open if overextended"],
      variations: ["Cross to the body", "Check-hook counter off a slipped cross", "Cross-counter (over the opponent's jab)"],
      relatedIds: ["jab", "hook", "uppercut"],
      drills: [
        { name: "1-2 Combination Drill", duration: "10 min", difficulty: "Beginner", equipment: "None", benefit: "Builds the jab-cross rhythm" },
        { name: "Heavy Bag Power Cross Rounds", duration: "3x3 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Develops hip-driven power" },
        { name: "Pivot & Cross Drill", duration: "8 min", difficulty: "Advanced", equipment: "None", benefit: "Combines footwork with power generation" }
      ],
      quiz: [
        { question: "Where does the cross's power primarily come from?", options: ["The arm muscles", "The back foot and hip rotation", "The shoulder alone", "Momentum from the jab"], correctIndex: 1 }
      ]
    },
    {
      id: "hook",
      name: "The Hook",
      subtitle: "Rotational Force (#3)",
      image: "/guru/images/hook.jpg",
      videoUrl: "/guru/moves/hook.mp4",
      score: 70,
      description: "A semi-circular punch delivered with a bent arm. Focuses on rotational core strength.",
      whyImportant: "The hook attacks from an angle straight punches can't reach, making it one of the highest-percentage knockout punches in boxing.",
      whenToUse: "At close-to-mid range, especially after the opponent's guard is occupied by a straight punch.",
      steps: [
        "Shift weight to lead leg.",
        "Pivot lead foot and hip 90 degrees inward.",
        "Whip arm across with elbow bent at roughly 90 degrees.",
        "Keep rear hand up to protect the chin throughout."
      ],
      tips: [
        "Lock your arm at a 90-degree angle and treat your entire upper body as a solid block rotating as one unit.",
        "Rotate through the hips, not just the shoulder.",
        "Keep the elbow at the same height as the fist — don't drop it."
      ],
      category: "punches",
      stats: [
        { label: "SPEED", val: "70%" },
        { label: "POWER", val: "96%" },
        { label: "RISK", val: "60%" }
      ],
      metrics: {
        offense: 92, defense: 35, difficulty: 55, energy: 55,
        learningCurve: 50, fightApplicability: 80, counterPotential: 40,
        versatility: 60, speedRequirement: 60, timingPrecision: 70
      },
      mistakes: ["Winding up (dropping the hand before punching)", "Throwing with just the arm, no hip rotation", "Opening the elbow too wide"],
      pro_tip: "Lock your arm at a 90-degree angle and treat your entire upper body as a solid block rotating as one unit.",
      targets: ["Jaw", "Temple", "Liver"],
      bestFor: ["Close-to-mid range power shots", "Combination finishers", "Attacking around a high guard"],
      advantages: ["Very high knockout potential", "Attacks an angle straight punches can't reach"],
      weaknesses: ["Highest self-exposure risk of the core four punches if it misses", "Requires good balance and timing to not overcommit"],
      variations: ["Body hook (liver shot)", "Check hook (defensive counter while pivoting out)", "Lead hook off a slip"],
      relatedIds: ["cross", "uppercut", "slip"],
      drills: [
        { name: "Hook Form Shadowboxing", duration: "8 min", difficulty: "Beginner", equipment: "None", benefit: "Grooves correct hip-driven mechanics" },
        { name: "Heavy Bag Hook Rounds", duration: "3x3 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Power and timing under fatigue" },
        { name: "Check Hook Counter Drill", duration: "8 min", difficulty: "Advanced", equipment: "Partner", benefit: "Combines defense with a power counter" }
      ],
      quiz: [
        { question: "What's the most common technical error when throwing a hook?", options: ["Too much hip rotation", "Winding up before throwing", "Keeping the elbow high", "Exhaling on impact"], correctIndex: 1 }
      ]
    },
    {
      id: "uppercut",
      name: "Uppercut",
      subtitle: "Close Range Lifter (#6)",
      image: "/guru/images/uppercut.jpg",
      videoUrl: "/guru/moves/uppercut.mp4",
      score: 60,
      description: "An upward-moving punch from the waist. Used for close-range 'shoe-shine' drills and clinch exchanges.",
      whyImportant: "It's one of the few punches that goes straight through the center of a tight guard, making it a key close-range tool.",
      whenToUse: "In close quarters, especially against an opponent covering up with a high, tight guard.",
      steps: [
        "Dip knees slightly to load the hips.",
        "Drive upward using the legs, not just the arm.",
        "Rotate the palm toward you upon impact.",
        "Snap back to guard immediately after."
      ],
      tips: [
        "Drop your level slightly before throwing — the power of an uppercut comes from standing up into the punch.",
        "Keep the punch short and compact at close range.",
        "Don't lift your chin while loading the shot."
      ],
      category: "punches",
      stats: [
        { label: "SPEED", val: "80%" },
        { label: "POWER", val: "88%" },
        { label: "RISK", val: "75%" }
      ],
      metrics: {
        offense: 82, defense: 25, difficulty: 60, energy: 55,
        learningCurve: 55, fightApplicability: 55, counterPotential: 35,
        versatility: 45, speedRequirement: 55, timingPrecision: 75
      },
      mistakes: ["Dropping the hand to the waist to wind up", "Lifting the chin while punching", "Not using the legs for upward thrust"],
      pro_tip: "Drop your level slightly before throwing. The power of an uppercut comes from you standing up into the punch.",
      targets: ["Chin", "Solar Plexus"],
      bestFor: ["Close-range clinch exchanges", "Breaking through a tight, high guard", "Combination finishers at close range"],
      advantages: ["Goes through the center of a guard", "Devastating when it lands clean at close range"],
      weaknesses: ["High risk of exposure if the opponent isn't actually close", "Least versatile of the core punches at range"],
      variations: ["Lead uppercut", "Rear uppercut", "Body uppercut (liver/solar plexus)"],
      relatedIds: ["hook", "cross"],
      drills: [
        { name: "Shoe-Shine Combo Drill", duration: "8 min", difficulty: "Intermediate", equipment: "None", benefit: "Builds close-range hand speed" },
        { name: "Heavy Bag Uppercut Rounds", duration: "3x2 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Develops upward power generation" }
      ],
      quiz: [
        { question: "Where does uppercut power mainly come from?", options: ["The wrist snap", "Standing up into the punch with the legs", "Arm strength alone", "Leaning back first"], correctIndex: 1 }
      ]
    }
  ],
  kicks: [
    {
      id: "teep",
      name: "Teep Kick",
      subtitle: "The Front Push",
      image: "/guru/images/teep.jpg",
      videoUrl: "/guru/moves/teep-kick.mp4",
      score: 58,
      description: "A linear thrust using the ball of the foot. Great for range control, balance, and core stability.",
      whyImportant: "The teep is the best range-management tool in kickboxing — it interrupts an opponent's rhythm and keeps them at the end of your reach.",
      whenToUse: "To stop an advancing opponent, create distance, or as a range-finder similar to a boxing jab.",
      steps: [
        "Lift lead knee high to chest.",
        "Thrust hips forward while extending the leg.",
        "Strike with the ball of the foot.",
        "Retract the leg quickly and reset stance."
      ],
      tips: ["Keep your hands up while kicking — a teep with dropped hands is an invitation to counter.", "Drive through the hips, not just the leg.", "Land on the ball of the foot, not the toes."],
      category: "kicks",
      stats: [
        { label: "RANGE", val: "95%" },
        { label: "POWER", val: "60%" },
        { label: "CONTROL", val: "90%" }
      ],
      metrics: {
        offense: 45, defense: 70, difficulty: 35, energy: 35,
        learningCurve: 30, fightApplicability: 70, counterPotential: 60,
        versatility: 65, speedRequirement: 50, timingPrecision: 45
      },
      mistakes: ["Dropping hands while kicking", "Leaning back too far on the thrust", "Telegraphing with a slow knee lift"],
      pro_tip: "Think of the teep as a push, not a strike — you're using your whole body to create distance, not just landing an impact.",
      bestFor: ["Range control against pressure fighters", "Interrupting combinations", "Off-balancing an advancing opponent"],
      advantages: ["Excellent range management", "Low commitment, easy to recover from"],
      weaknesses: ["Low knockout power on its own", "Vulnerable to being caught and swept if telegraphed"],
      variations: ["Rear leg teep (more power)", "Side teep to the body"],
      relatedIds: ["roundhouse", "sidekick", "slip"],
      drills: [
        { name: "Teep Range Drill", duration: "8 min", difficulty: "Beginner", equipment: "None", benefit: "Builds range awareness and balance" },
        { name: "Pad Teep Rounds", duration: "3x2 min", difficulty: "Intermediate", equipment: "Kick pads/partner", benefit: "Sharpens accuracy and push power" }
      ],
      quiz: [
        { question: "What part of the foot strikes in a teep?", options: ["The heel", "The ball of the foot", "The toes", "The shin"], correctIndex: 1 }
      ]
    },
    {
      id: "roundhouse",
      name: "Roundhouse",
      subtitle: "Power Shin Strike",
      image: "/guru/images/roundhouse.jpg",
      videoUrl: "/guru/moves/roundhouse-kick.mp4",
      score: 90,
      isAiPick: true,
      description: "A rotational strike using the shin. Requires significant hip mobility and is one of the highest-power strikes available.",
      whyImportant: "The roundhouse is widely considered the single hardest-hitting strike in kickboxing/Muay Thai due to full hip rotation behind the shin.",
      whenToUse: "As a power finisher, or to attack the legs/body when an opponent is standing square.",
      steps: [
        "Step 45° off-line with the lead foot.",
        "Swing the rear leg, turning the hip over completely.",
        "Strike with the lower shin, not the foot.",
        "Recover balance quickly to defend the counter."
      ],
      tips: ["Fully commit the hip — a half-turned roundhouse is both weak and easy to catch.", "Keep your guard up on the non-kicking side throughout.", "Land with the shin, never the foot, to avoid injury and maximize power."],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "70%" },
        { label: "POWER", val: "98%" },
        { label: "RECOVERY", val: "50%" }
      ],
      metrics: {
        offense: 96, defense: 20, difficulty: 65, energy: 70,
        learningCurve: 60, fightApplicability: 75, counterPotential: 30,
        versatility: 55, speedRequirement: 55, timingPrecision: 65
      },
      mistakes: ["Striking with the foot instead of the shin", "Not fully rotating the hip", "Dropping the guard on the kicking side"],
      pro_tip: "The full hip turnover is what separates a painful roundhouse from a devastating one — commit to the rotation.",
      targets: ["Thigh", "Ribs", "Head"],
      bestFor: ["Power finishers", "Leg kicks to slow an opponent's mobility", "Attacking a squared-up stance"],
      advantages: ["Highest power output of any standard strike", "Multiple target levels (low/mid/high)"],
      weaknesses: ["Longest recovery time of the core strikes", "High counter-vulnerability if caught mid-kick"],
      variations: ["Low kick (leg)", "Body roundhouse", "Head-level roundhouse (advanced)"],
      relatedIds: ["teep", "sidekick", "kneestrike"],
      drills: [
        { name: "Hip Rotation Drill (no strike)", duration: "5 min", difficulty: "Beginner", equipment: "None", benefit: "Builds the turnover mechanic safely" },
        { name: "Heavy Bag Roundhouse Rounds", duration: "3x3 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Power development" },
        { name: "Catch & Counter Drill", duration: "8 min", difficulty: "Advanced", equipment: "Partner", benefit: "Builds recovery speed and balance" }
      ],
      quiz: [
        { question: "What part of the leg should make contact in a roundhouse kick?", options: ["The foot", "The knee", "The shin", "The toes"], correctIndex: 2 }
      ]
    },
    {
      id: "kneestrike",
      name: "Knee Strike",
      subtitle: "Clinch Weapon",
      image: "/guru/images/kneestrike.jpg",
      videoUrl: "/guru/moves/kneestrike.mp4",
      score: 78,
      description: "A close-range upward thrust delivered from the clinch. One of the most damaging strikes at extreme close range.",
      whyImportant: "In the clinch — where punches lose power — the knee remains a full-power weapon, making it critical for close-range fighters.",
      whenToUse: "During clinch exchanges, especially after controlling an opponent's head or shoulders.",
      steps: [
        "Secure opponent's head or guard (clinch control).",
        "Thrust hips forward aggressively.",
        "Drive the knee point straight into the target.",
        "Reset base immediately to avoid being off-balance."
      ],
      tips: ["Control before you strike — an uncontrolled knee has little power.", "Drive through the hips, not just lift the leg.", "Keep your posting hand active to maintain balance."],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "85%" },
        { label: "POWER", val: "85%" },
        { label: "RANGE", val: "10%" }
      ],
      metrics: {
        offense: 88, defense: 15, difficulty: 55, energy: 60,
        learningCurve: 50, fightApplicability: 45, counterPotential: 25,
        versatility: 30, speedRequirement: 50, timingPrecision: 55
      },
      mistakes: ["Striking without clinch control first", "Losing base/balance on the thrust", "Telegraphing by leaning back before driving forward"],
      pro_tip: "The knee is a control weapon first, a strike second — win the clinch position, and the knee takes care of itself.",
      targets: ["Body", "Thigh"],
      bestFor: ["Clinch exchanges", "Close-range finishing", "Neutralizing an opponent who ties you up"],
      advantages: ["Retains full power at a range where punches lose effectiveness", "Hard to see coming from the clinch"],
      weaknesses: ["Almost entirely dependent on clinch control", "Very short effective range"],
      variations: ["Straight knee", "Curved (Thai) knee", "Flying knee (advanced)"],
      relatedIds: ["roundhouse", "uppercut"],
      drills: [
        { name: "Clinch Control Drill", duration: "8 min", difficulty: "Intermediate", equipment: "Partner", benefit: "Builds the control needed before striking" },
        { name: "Bag Knee Rounds", duration: "3x2 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Power and hip-drive development" }
      ],
      quiz: [
        { question: "What should come before a clinch knee strike?", options: ["A jab", "Securing clinch control", "A pivot", "Nothing — strike immediately"], correctIndex: 1 }
      ]
    },
    {
      id: "sidekick",
      name: "Side Kick",
      subtitle: "Lateral Thrust",
      image: "/guru/images/sidekick.jpg",
      videoUrl: "/guru/moves/sidekick.mp4",
      score: 62,
      description: "A powerful lateral thrust using the heel. Excellent for maintaining distance against a rushing opponent.",
      whyImportant: "It's the most effective kick for stopping a charging opponent dead in their tracks due to its straight-line power and long reach.",
      whenToUse: "Against an opponent closing distance aggressively, or to attack the body/legs from range.",
      steps: [
        "Chamber the knee across the body.",
        "Extend the leg laterally using the glutes.",
        "Strike with the heel, toes pointing down.",
        "Retract and reset stance quickly."
      ],
      tips: ["Chamber high and tight before extending for maximum power.", "Strike with the heel — the toes and flat of the foot lack the same driving power.", "Keep your base leg slightly bent for stability."],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "60%" },
        { label: "POWER", val: "90%" },
        { label: "DIFFICULTY", val: "90%" }
      ],
      metrics: {
        offense: 80, defense: 55, difficulty: 70, energy: 55,
        learningCurve: 65, fightApplicability: 50, counterPotential: 40,
        versatility: 40, speedRequirement: 40, timingPrecision: 60
      },
      mistakes: ["Striking with the flat of the foot instead of the heel", "Insufficient chamber, reducing power", "Poor base-leg stability causing balance loss"],
      pro_tip: "A side kick is a push AND a strike — think about driving your heel through the target, not just at it.",
      targets: ["Body", "Thigh", "Knee (defensive stop-kick)"],
      bestFor: ["Stopping a rushing opponent", "Long-range body attacks", "Defensive stop-kicks"],
      advantages: ["Longest reach of the standard kicks", "Excellent stopping power against forward pressure"],
      weaknesses: ["Highest technical difficulty of the kicks covered here", "Slower to chamber than a roundhouse or teep"],
      variations: ["Spinning side kick (advanced)", "Low side kick to the leg"],
      relatedIds: ["teep", "roundhouse"],
      drills: [
        { name: "Chamber & Extend Drill", duration: "8 min", difficulty: "Intermediate", equipment: "None", benefit: "Isolates and grooves the mechanic" },
        { name: "Pad Side Kick Rounds", duration: "3x2 min", difficulty: "Advanced", equipment: "Kick pads/partner", benefit: "Power and balance under resistance" }
      ],
      quiz: [
        { question: "What part of the foot lands in a proper side kick?", options: ["The toes", "The heel", "The ball of the foot", "The arch"], correctIndex: 1 }
      ]
    }
  ],
  defense: [
    {
      id: "slip",
      name: "The Slip",
      subtitle: "Head Movement",
      image: "/guru/images/slip.jpg",
      videoUrl: "/guru/moves/slip.mp4",
      score: 75,
      isAiPick: true,
      description: "Moving the head slightly to the left or right to avoid a straight punch, while staying in range to counter.",
      whyImportant: "Slipping keeps you in counter-punching range while avoiding damage — unlike blocking, it costs your opponent more than it costs you.",
      whenToUse: "Against straight punches (jab/cross) when you want to stay close enough to counter immediately.",
      steps: [
        "Keep eyes on opponent throughout.",
        "Move head slightly off the center line.",
        "Load weight onto the corresponding leg for a counter.",
        "Return to center guard immediately after."
      ],
      tips: ["A slip only needs a few inches of movement — over-slipping wastes energy and balance.", "Keep your hands up during the slip; it's not a substitute for guard.", "Load your counter as part of the same motion, not a separate step."],
      category: "defense",
      stats: [
        { label: "EVASION", val: "90%" },
        { label: "ENERGY", val: "95%" },
        { label: "RISK", val: "40%" }
      ],
      metrics: {
        offense: 40, defense: 88, difficulty: 55, energy: 20,
        learningCurve: 50, fightApplicability: 85, counterPotential: 90,
        versatility: 70, speedRequirement: 65, timingPrecision: 85
      },
      mistakes: ["Slipping too far and losing balance/power position", "Closing the eyes on the slip", "Not resetting guard immediately after"],
      pro_tip: "A great slip sets up a great counter — think of it as loading a spring, not just dodging.",
      bestFor: ["Countering straight punches", "Staying in pocket range", "Setting up counter combinations"],
      advantages: ["Very low energy cost", "Keeps you in counter range instead of retreating"],
      weaknesses: ["Only effective against straight-line attacks, not hooks", "Requires precise timing to avoid getting clipped"],
      variations: ["Slip-and-counter (cross-counter)", "Double slip (against a 1-2)"],
      relatedIds: ["roll", "pivot", "jab"],
      drills: [
        { name: "Slip Bag / Rope Drill", duration: "8 min", difficulty: "Intermediate", equipment: "Slip rope or bag", benefit: "Builds head-movement reflexes" },
        { name: "Partner Slip & Counter", duration: "10 min", difficulty: "Advanced", equipment: "Partner", benefit: "Combines evasion with offense under pressure" }
      ],
      quiz: [
        { question: "What type of punch is a slip most effective against?", options: ["Hooks", "Straight punches", "Uppercuts", "All punches equally"], correctIndex: 1 }
      ]
    },
    {
      id: "roll",
      name: "The Roll",
      subtitle: "Under The Hook",
      image: "/guru/images/roll.jpg",
      videoUrl: "/guru/moves/roll.mp4",
      score: 55,
      description: "A 'U'-shaped movement under a hook, dropping level and coming up on the outside of the punch.",
      whyImportant: "It's the primary defense against hooks — a punch type that a simple slip can't reliably avoid.",
      whenToUse: "Against hooks, especially in close-to-mid range exchanges.",
      steps: [
        "Drop level by bending the knees (don't bend at the waist).",
        "Draw a 'U' shape with your head, staying low.",
        "Come up on the outside of the punch.",
        "Reset guard immediately on the way up."
      ],
      tips: ["Bend the knees, not the waist — bending at the waist telegraphs and exposes you to an uppercut.", "Keep your eyes on your opponent the entire time.", "Come up already in position to counter."],
      category: "defense",
      stats: [
        { label: "EVASION", val: "85%" },
        { label: "ENERGY", val: "80%" },
        { label: "COUNTER", val: "90%" }
      ],
      metrics: {
        offense: 45, defense: 85, difficulty: 65, energy: 45,
        learningCurve: 60, fightApplicability: 65, counterPotential: 85,
        versatility: 40, speedRequirement: 55, timingPrecision: 80
      },
      mistakes: ["Bending at the waist instead of the knees", "Coming up directly into a second hook", "Losing sight of the opponent while rolling"],
      pro_tip: "Roll under and slightly to the outside — coming up straight in the middle just walks you into the next punch.",
      bestFor: ["Defending hooks specifically", "Close-range defensive exchanges", "Setting up body-shot counters"],
      advantages: ["Highly effective specifically against hooks", "Excellent counter setup on the way up"],
      weaknesses: ["Vulnerable to a well-timed uppercut if done incorrectly", "Physically demanding over multiple rounds"],
      variations: ["Roll to a body shot counter", "Double roll (against a hook combination)"],
      relatedIds: ["slip", "hook", "pivot"],
      drills: [
        { name: "Level Change Drill", duration: "5 min", difficulty: "Beginner", equipment: "None", benefit: "Isolates the knee-bend mechanic" },
        { name: "Roll Under Bag Hooks", duration: "8 min", difficulty: "Advanced", equipment: "Partner throwing hooks", benefit: "Timing under real punch speed" }
      ],
      quiz: [
        { question: "What should you bend to drop level for a roll?", options: ["The waist", "The knees", "The neck", "Nothing, stay upright"], correctIndex: 1 }
      ]
    },
    {
      id: "pivot",
      name: "The Pivot",
      subtitle: "Angle Creation",
      image: "assets/pivot.png",
      score: 63,
      description: "Rotating on the lead foot to change the angle of attack, taking you off the centerline where opponents expect you.",
      whyImportant: "Fighting in straight lines makes you predictable — the pivot is the core tool for creating new angles opponents haven't adjusted to yet.",
      whenToUse: "After an exchange, to escape the pocket at an angle rather than retreating straight back into range.",
      steps: [
        "Keep weight on the ball of the lead foot.",
        "Swing the rear leg around 45-90 degrees.",
        "Maintain guard throughout the rotation.",
        "Reset into stance facing the new angle."
      ],
      tips: ["Pivot off exchanges, not before them — timing it right after your own combination is safest.", "Keep your guard up the entire rotation; this isn't a moment to relax defense.", "A bigger pivot isn't always better — just enough to escape the centerline."],
      category: "defense",
      stats: [
        { label: "POSITION", val: "95%" },
        { label: "SPEED", val: "80%" },
        { label: "UTILITY", val: "90%" }
      ],
      metrics: {
        offense: 35, defense: 75, difficulty: 45, energy: 30,
        learningCurve: 40, fightApplicability: 80, counterPotential: 70,
        versatility: 85, speedRequirement: 45, timingPrecision: 60
      },
      mistakes: ["Retreating straight back instead of pivoting off-line", "Dropping the guard mid-rotation", "Over-rotating and losing balance"],
      pro_tip: "Retreating in a straight line just resets the same fight — pivoting actually changes it.",
      bestFor: ["Escaping the pocket safely", "Creating new attacking angles", "Avoiding being cornered/trapped on the ropes"],
      advantages: ["Extremely versatile — useful offensively and defensively", "Low energy cost relative to the tactical value"],
      weaknesses: ["Requires good balance and lead-foot stability", "Less effective if done too late in an exchange"],
      variations: ["Pivot into a hook", "Southpaw-style outside pivot"],
      relatedIds: ["slip", "roll", "southpaw"],
      drills: [
        { name: "Pivot Circuit", duration: "8 min", difficulty: "Beginner", equipment: "None", benefit: "Builds the rotation habit in isolation" },
        { name: "Combo + Pivot Out Drill", duration: "10 min", difficulty: "Intermediate", equipment: "Heavy Bag", benefit: "Links offense directly to angle-escape" }
      ],
      quiz: [
        { question: "Which foot do you pivot on for a standard exit pivot?", options: ["Rear foot", "Lead foot", "Either, it doesn't matter", "Both simultaneously"], correctIndex: 1 }
      ]
    }
  ]
};
