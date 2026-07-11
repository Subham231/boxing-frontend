import { Technique } from '@/types';

export interface TechniqueStat {
  label: string;
  val: string;
}

export interface TechniqueDetail extends Technique {
  subtitle: string;
  image: string;
  score: number;
  stats: TechniqueStat[];
  mistakes?: string[];
  pro_tip?: string;
  targets?: string[];
  isAiPick?: boolean;
}

export const techniquesData: Record<'stances' | 'punches' | 'kicks' | 'defense' | string, TechniqueDetail[]> = {
  stances: [
    {
      id: "orthodox",
      name: "Orthodox",
      subtitle: "Standard Foundation",
      image: "assets/orthodox.jpg",
      score: 98,
      description: "The foundation of all combat movement. Proper stance ensures balance for the Aerial vertical leaps and stability for power shots.",
      steps: [
        "Lead foot (Left) forward, pointing at 1 o'clock.",
        "Rear foot (Right) back at 4 o'clock, heel slightly raised.",
        "Hands high: Left at cheek, Right protecting chin."
      ],
      tips: [],
      category: "stances",
      stats: [
        { label: "BALANCE", val: "95%" },
        { label: "MOBILITY", val: "85%" },
        { label: "STABILITY", val: "90%" }
      ]
    },
    {
      id: "southpaw",
      name: "Southpaw",
      subtitle: "Lefty Configuration",
      image: "assets/southpaw.jpg",
      score: 25,
      description: "The mirror image of Orthodox. Often tricky for opponents to deal with due to the open angle.",
      steps: [
        "Lead foot (Right) forward at 11 o'clock.",
        "Rear foot (Left) back at 8 o'clock.",
        "Invert Guard: Right hand lead, Left hand rear."
      ],
      tips: [],
      category: "stances",
      stats: [
        { label: "BALANCE", val: "80%" },
        { label: "MOBILITY", val: "85%" },
        { label: "ANGLE", val: "99%" }
      ]
    }
  ],
  punches: [
    {
      id: "jab",
      name: "The Jab",
      subtitle: "Range Finder (#1)",
      image: "assets/jab.jpg",
      score: 85,
      isAiPick: true,
      description: "A straight lead-hand punch. Used for range-finding and setting up power. The 'snapping' motion is key.",
      steps: [
        "Step in with lead foot to close distance.",
        "Extend lead arm straight, rotating fist at the end.",
        "Snap back immediately to guard position."
      ],
      tips: ["Think of your arm like a whip. It's not about pushing weight, it's about speed and tension at the very end of the motion."],
      category: "punches",
      stats: [
        { label: "SPEED", val: "98%" },
        { label: "POWER", val: "45%" },
        { label: "UTILITY", val: "100%" }
      ],
      mistakes: ["Dropping rear hand during extension", "Pushing instead of snapping", "Telegraphing the punch with elbow flare"],
      pro_tip: "Think of your arm like a whip. It's not about pushing weight, it's about speed and tension at the very end of the motion.",
      targets: ["Chin", "Nose", "Solar Plexus"]
    },
    {
      id: "cross",
      name: "The Cross",
      subtitle: "Rear Hand Power (#2)",
      image: "assets/cross.jpg",
      score: 60,
      description: "A straight rear-hand punch. High power generated from the rotation of the rear hip and foot.",
      steps: [
        "Rotate rear hip and foot ('Squish the Bug').",
        "Drive rear hand straight down the pipe.",
        "Protect chin with lead shoulder on extension."
      ],
      tips: ["The power comes entirely from the back foot pivoting and the hips rotating. The arm is just a vehicle for that force."],
      category: "punches",
      stats: [
        { label: "SPEED", val: "75%" },
        { label: "POWER", val: "92%" },
        { label: "RANGE", val: "85%" }
      ],
      mistakes: ["Squaring up the shoulders", "Reaching too far and losing balance", "Not pivoting the back foot"],
      pro_tip: "The power comes entirely from the back foot pivoting and the hips rotating. The arm is just a vehicle for that force.",
      targets: ["Jaw", "Nose", "Body"]
    },
    {
      id: "hook",
      name: "The Hook",
      subtitle: "Rotational Force (#3)",
      image: "assets/hook.jpg",
      score: 45,
      description: "A semi-circular punch delivered with a bent arm. Focuses on rotational core strength.",
      steps: [
        "Shift weight to lead leg.",
        "Pivot lead foot and hip 90 degrees inward.",
        "Whip arm across with elbow bent at 90 degrees."
      ],
      tips: ["Lock your arm at a 90-degree angle and treat your entire upper body as a solid block rotating as one unit."],
      category: "punches",
      stats: [
        { label: "SPEED", val: "70%" },
        { label: "POWER", val: "96%" },
        { label: "RISK", val: "60%" }
      ],
      mistakes: ["Winding up (dropping the hand before punching)", "Throwing with just the arm, no hip rotation", "Opening the elbow too wide"],
      pro_tip: "Lock your arm at a 90-degree angle and treat your entire upper body as a solid block rotating as one unit.",
      targets: ["Jaw", "Temple", "Liver"]
    },
    {
      id: "uppercut",
      name: "Uppercut",
      subtitle: "Close Range Lifter (#6)",
      image: "assets/uppercut.png",
      score: 30,
      description: "An upward-moving punch from the waist. Used for close-range 'Shoe-Shine' drills.",
      steps: [
        "Dip knees slightly to load the hips.",
        "Drive upward using legs, not just arm.",
        "Rotate palm towards you upon impact."
      ],
      tips: ["Drop your level slightly before throwing. The power of an uppercut comes from you standing up into the punch."],
      category: "punches",
      stats: [
        { label: "SPEED", val: "80%" },
        { label: "POWER", val: "88%" },
        { label: "RISK", val: "75%" }
      ],
      mistakes: ["Dropping the hand to the waist to wind up", "Lifting the chin while punching", "Not using the legs for upward thrust"],
      pro_tip: "Drop your level slightly before throwing. The power of an uppercut comes from you standing up into the punch.",
      targets: ["Chin", "Solar Plexus"]
    }
  ],
  kicks: [
    {
      id: "teep",
      name: "Teep Kick",
      subtitle: "The Front Push",
      image: "assets/teep.jpg",
      score: 40,
      description: "A linear thrust using the ball of the foot. Great for balance and core stability.",
      steps: [
        "Lift lead knee high to chest.",
        "Thrust hips forward while extending leg.",
        "Strike with the ball of the foot."
      ],
      tips: [],
      category: "kicks",
      stats: [
        { label: "RANGE", val: "95%" },
        { label: "POWER", val: "60%" },
        { label: "CONTROL", val: "90%" }
      ]
    },
    {
      id: "roundhouse",
      name: "Roundhouse",
      subtitle: "Power Shin Strike",
      image: "assets/roundhouse.jpg",
      score: 92,
      description: "A rotational strike using the shin. Requires significant hip mobility.",
      steps: [
        "Step 45° off-line with lead foot.",
        "Swing rear leg, turning hip over completely.",
        "Strike with the lower shin, not the foot."
      ],
      tips: [],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "70%" },
        { label: "POWER", val: "98%" },
        { label: "RECOVERY", val: "50%" }
      ]
    },
    {
      id: "kneestrike",
      name: "Knee Strike",
      subtitle: "Clinch Weapon",
      image: "assets/kneestrike.png",
      score: 75,
      description: "A close-range upward thrust. This is a primary driver for intensity.",
      steps: [
        "Secure opponent's head or guard.",
        "Thrust hips forward aggressively.",
        "Drive knee point straight into target."
      ],
      tips: [],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "85%" },
        { label: "POWER", val: "85%" },
        { label: "RANGE", val: "10%" }
      ]
    },
    {
      id: "sidekick",
      name: "Side Kick",
      subtitle: "Lateral Thrust",
      image: "assets/sidekick.jpg",
      score: 55,
      description: "A powerful lateral thrust using the heel. Excellent for glute and lateral stability.",
      steps: [
        "Chamber knee across body.",
        "Extend leg laterally using glutes.",
        "Strike with the heel, toes pointing down."
      ],
      tips: [],
      category: "kicks",
      stats: [
        { label: "SPEED", val: "60%" },
        { label: "POWER", val: "90%" },
        { label: "DIFFICULTY", val: "90%" }
      ]
    }
  ],
  defense: [
    {
      id: "slip",
      name: "The Slip",
      subtitle: "Head Movement",
      image: "assets/slip.jpg",
      score: 65,
      description: "Moving the head slightly to the left or right to avoid a straight punch.",
      steps: [
        "Keep eyes on opponent.",
        "Move head slightly off-center line.",
        "Load weight onto corresponding leg for counter."
      ],
      tips: [],
      category: "defense",
      stats: [
        { label: "EVASION", val: "90%" },
        { label: "ENERGY", val: "95%" },
        { label: "RISK", val: "40%" }
      ]
    },
    {
      id: "roll",
      name: "The Roll",
      subtitle: "Under The Hook",
      image: "assets/roll.png",
      score: 30,
      description: "A 'U' shaped movement under a hook.",
      steps: [
        "Drop level by bending knees (don't bend waist).",
        "Draw a 'U' shape with your head.",
        "Come up on the outside of the punch."
      ],
      tips: [],
      category: "defense",
      stats: [
        { label: "EVASION", val: "85%" },
        { label: "ENERGY", val: "80%" },
        { label: "COUNTER", val: "90%" }
      ]
    },
    {
      id: "pivot",
      name: "The Pivot",
      subtitle: "Angle Creation",
      image: "assets/pivot.png",
      score: 50,
      description: "Rotating on the lead foot to change the angle of attack.",
      steps: [
        "Keep weight on lead foot ball.",
        "Swing rear leg around 45-90 degrees.",
        "Maintain guard during rotation."
      ],
      tips: [],
      category: "defense",
      stats: [
        { label: "POSITION", val: "95%" },
        { label: "SPEED", val: "80%" },
        { label: "UTILITY", val: "90%" }
      ]
    }
  ]
};
