// src/utils/localPlannerEngine.js

const EXERCISE_DATABASE = {
  push: [
    { name: 'Pike Pushups', target: 'Shoulders/Triceps', baseDuration: 4 },
    { name: 'Decline Pushups', target: 'Upper Chest', baseDuration: 3 },
    { name: 'Standard Pushups', target: 'Chest/Shoulders', baseDuration: 3 },
    { name: 'Diamond Pushups', target: 'Triceps/Inner Chest', baseDuration: 3 }
  ],
  pull: [
    { name: 'Pull-ups / Chin-ups', target: 'Lats/Biceps', baseDuration: 4 },
    { name: 'Inverted Bodyweight Rows', target: 'Upper Back', baseDuration: 3 },
    { name: 'Doorframe Pulls / Towel Rows', target: 'Mid Back', baseDuration: 3 }
  ],
  legs: [
    { name: 'Pistol Squat Progressions', target: 'Quads/Balance', baseDuration: 4 },
    { name: 'Bulgarian Split Squats', target: 'Quads/Glutes', baseDuration: 3 },
    { name: 'Bodyweight Squats', target: 'Quads', baseDuration: 3 }
  ],
  core: [
    { name: 'Hanging Leg Raises / Knee Raises', target: 'Lower Abs', baseDuration: 3 },
    { name: 'Hardstyle Planks', target: 'Core Stability', baseDuration: 2 },
    { name: 'Russian Twists', target: 'Obliques', baseDuration: 2 }
  ]
};

// Tactical Boxing Volume Drills categorized by primary athletic attributes
const BOXING_CONDITIONING_DATABASE = {
  push: [
    { name: 'Power Cross Trajectory', target: 'Punch Strength & Tricep Snap', prescription: '100 Reps (Full Rotation)' },
    { name: 'Corkscrew Uppercuts', target: 'Shoulder Power & Speed', prescription: '4 Sets x 25 Reps' }
  ],
  pull: [
    { name: 'High-Volume Straight Jabs', target: 'Shoulder Stamina & Guard Endurance', prescription: '150 Reps (Continuous Pacemark)' },
    { name: 'Lead Hook Burnouts', target: 'Lat/Lats Snap & Muscular Endurance', prescription: '80 Reps (Maximum Torque)' }
  ],
  legs: [
    { name: 'Slip-Counter Hook Combinations', target: 'Agility & Kinetic Chain Transfer', prescription: '60 Full Cycles' },
    { name: 'Level-Change Body Shot Drills', target: 'Thigh Stamina & Cardio Output', prescription: '3 Sets x 30 Seconds Non-Stop' }
  ],
  core: [
    { name: 'Jab-Cross Shadow Blitz', target: 'High-Intensity Anaerobic Endurance', prescription: '3 Rounds x 1 Minute' },
    { name: 'Weave-Step Uppercut Volleys', target: 'Oblique & Rotational Coordination', prescription: '100 Reps Total' }
  ]
};

/**
 * Generates a deterministic workout plan client-side combining calisthenics and boxing volume.
 * @param {Object} preferences - User data from onboarding.
 */
export function generateLocalPlanner(preferences) {
  const { daysPerWeek = 3, availableMinutes = 30, experienceLevel = 'intermediate' } = preferences;
  
  let repsScheme = '3 sets x 8-12 reps';
  if (experienceLevel === 'beginner') repsScheme = '3 sets x 5-8 reps';
  if (experienceLevel === 'advanced') repsScheme = '4 sets x 12-20 reps (To Failure)';

  const weeklySchedule = [];
  
  let rotation = [];
  if (daysPerWeek <= 3) {
    rotation = [
      { name: 'Day 1: Push Focus + Power Strength', groups: ['push', 'core'], fightMod: 'push' },
      { name: 'Day 2: Pull Focus + Guard Stamina', groups: ['pull', 'core'], fightMod: 'pull' },
      { name: 'Day 3: Legs Focus + Kinetic Endurance', groups: ['legs', 'core'], fightMod: 'legs' }
    ];
  } else {
    rotation = [
      { name: 'Day 1: Upper Body Push + Strength', groups: ['push'], fightMod: 'push' },
      { name: 'Day 2: Upper Body Pull + Stamina', groups: ['pull'], fightMod: 'pull' },
      { name: 'Day 3: Lower Body Legs + Agility', groups: ['legs'], fightMod: 'legs' },
      { name: 'Day 4: Core Conditioning + Speed', groups: ['core'], fightMod: 'core' },
      { name: 'Day 5: Full Body Combat Exhaustion', groups: ['push', 'pull'], fightMod: 'pull' }
    ];
  }

  rotation.forEach((daySlot, index) => {
    if (index >= daysPerWeek) return;

    let dayExercises = [];
    let dynamicTimeUsed = 0;
    const paddingTime = 5; // Warm-up configuration

    // 1. Pack Base Calisthenics Exercises
    daySlot.groups.forEach(groupName => {
      const sourcePool = EXERCISE_DATABASE[groupName] || [];
      sourcePool.forEach(ex => {
        if (dynamicTimeUsed + ex.baseDuration <= (availableMinutes - paddingTime)) {
          dayExercises.push({
            name: ex.name,
            target: ex.target,
            prescription: repsScheme
          });
          dynamicTimeUsed += ex.baseDuration;
        }
      });
    });

    // 2. Inject Boxing Volume Elements (Guaranteed mapping to current UI keys)
    const fightPool = BOXING_CONDITIONING_DATABASE[daySlot.fightMod] || [];
    fightPool.forEach(fightEx => {
      dayExercises.push({
        name: `🥊 ${fightEx.name}`,
        target: fightEx.target,
        prescription: fightEx.prescription
      });
    });

    weeklySchedule.push({
      title: daySlot.name,
      duration: `${dynamicTimeUsed + paddingTime + 5} mins`,
      exercises: dayExercises
    });
  });

  return weeklySchedule;
}
