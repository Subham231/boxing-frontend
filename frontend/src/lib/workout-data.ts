import { Drill, Workout } from '@/types';

export const bodyweightExercises: Record<string, any[]> = {
    "Legs": [
        { name: "Bodyweight Squats", baseReps: 15, instruction: "Keep chest up and weight on heels." },
        { name: "Lunges", baseReps: 10, instruction: "Alternate legs, maintain 90-degree angles." },
        { name: "Calf Raises", baseReps: 20, instruction: "Slow and controlled, full range of motion." },
        { name: "Glute Bridges", baseReps: 15, instruction: "Squeeze glutes at the top." },
        { name: "Jump Squats", baseReps: 10, instruction: "Explosive upward movement, soft landing." },
        { name: "Wall Sit", baseDuration: 30, instruction: "Hold parallel to the floor against a flat surface." }
    ],
    "Push/Chest": [
        { name: "Standard Pushups", baseReps: 10, instruction: "Maintain a straight plank position." },
        { name: "Diamond Pushups", baseReps: 8, instruction: "Hands in diamond shape to target triceps." },
        { name: "Wide Pushups", baseReps: 12, instruction: "Target outer chest and shoulders." },
        { name: "Pike Pushups", baseReps: 8, instruction: "Hips high, head towards floor to target shoulders." },
        { name: "Incline Pushups", baseReps: 15, instruction: "Hands on a raised surface (optional, but can use floor)." },
        { name: "Plank Shoulder Taps", baseReps: 20, instruction: "Minimize hip movement while tapping opposite shoulder." }
    ],
    "Core": [
        { name: "Situps", baseReps: 15, instruction: "Full range of motion, touch floor behind head." },
        { name: "Crunches", baseReps: 20, instruction: "Target upper abs, no neck pulling." },
        { name: "Leg Raises", baseReps: 12, instruction: "Keep lower back pressed against the floor." },
        { name: "Bicycle Crunches", baseReps: 20, instruction: "Opposite elbow to opposite knee." },
        { name: "Mountain Climbers", baseDuration: 30, instruction: "High knees, rapid pace." },
        { name: "Hollow Hold", baseDuration: 30, instruction: "Core compressed, limbs hovering." }
    ],
    "Back": [
        { name: "Superman", baseReps: 15, instruction: "Lift chest and legs simultaneously, hold for 1s." },
        { name: "Reverse Snow Angels", baseReps: 15, instruction: "Face down, rotate arms in a 'wing' motion." },
        { name: "Bird-Dog", baseReps: 16, instruction: "Opposite arm and leg extension, stay balanced." },
        { name: "Back Extensions", baseReps: 15, instruction: "Small pulses while lying face down." }
    ]
};

export const boxingRoutineExercises: any[] = [
    { name: "Shadowboxing Speed", baseDuration: 180, focus: "Reflexes", instruction: "Focus on rapid-fire jab-cross combinations." },
    { name: "Shadowboxing Power", baseDuration: 180, focus: "Strength", instruction: "Reset after every punch, throw with 100% rotation." },
    { name: "Shadowboxing Stamina", baseDuration: 180, focus: "Stamina", instruction: "Non-stop movement, high volume output." },
    { name: "Slip & Roll Drill", baseDuration: 120, focus: "Reflexes", instruction: "Shadowbox with heavy emphasis on head movement." },
    { name: "Pivot & Angle Drill", baseDuration: 120, focus: "Movement/Reflexes", instruction: "Punch then pivot 90 degrees immediately." },
    { name: "Sprawl-to-Box", baseReps: 10, focus: "Stamina/Reflexes", instruction: "Double jab, sprawl, return to stance." },
    { name: "Roundhouse Power", baseReps: 20, focus: "Leg Power", instruction: "Heavy roundhouse kicks on the bag or shadow." },
    { name: "Teep & Reset", baseReps: 15, focus: "Balance", instruction: "Maintain range with lead teeps, stay balanced." },
    { name: "Knee Strike Blitz", baseDuration: 60, focus: "Cardio", instruction: "Non-stop alternating knees at high pace." },
    { name: "Check & Counter", baseDuration: 120, focus: "Technique", instruction: "Check a low kick, immediately counter with a cross." },
    { name: "Bob & Weave Focus", baseDuration: 120, focus: "Defense", instruction: "Move under vertical obstacles, keeping eyes forward." }
];

export const muscleGroups = ["Legs", "Push/Chest", "Core", "Back"];
export const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function generateDailyWorkout(dateInput?: Date): Workout {
    const targetDate = dateInput || new Date();
    let level = 'Novice';
    let timeSlot = 30; // Minutes

    if (typeof window !== 'undefined') {
        try {
            const onboarding = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
            level = onboarding.experience_level || onboarding.experienceLevel || 'Novice';
            timeSlot = onboarding.available_time || onboarding.availableTime || 30;
        } catch (e) {
            console.error('Failed to parse onboarding data in generateDailyWorkout:', e);
        }
    }

    // Determine number of exercises based on rank/level
    let bodyweightCount = 2;
    let boxingCount = 1;

    if (level === 'Amateur') {
        bodyweightCount = 3;
        boxingCount = 2;
    } else if (level === 'Pro') {
        bodyweightCount = 4;
        boxingCount = 3;
    }

    const timeMultiplier = timeSlot >= 60 ? 2 : (timeSlot >= 30 ? 1.5 : 1);
    const levelMultiplier = level === 'Pro' ? 2 : (level === 'Amateur' ? 1.5 : 1);
    const totalMultiplier = timeMultiplier * levelMultiplier;

    // Pick a muscle group for today based on the date to stay consistent for the day
    const daySeed = targetDate.getDate() % muscleGroups.length;
    const muscleGroup = muscleGroups[daySeed];
    const pool = bodyweightExercises[muscleGroup] || bodyweightExercises["Legs"];

    const selectedBodyweight: Drill[] = [];
    const poolIndices = Array.from({ length: pool.length }, (_, i) => i);
    for (let i = 0; i < bodyweightCount && poolIndices.length > 0; i++) {
        const randomIndex = poolIndices.splice(Math.floor(Math.random() * poolIndices.length), 1)[0];
        const ex = { ...pool[randomIndex] };

        if (ex.baseReps) {
            const scaledReps = Math.ceil(ex.baseReps * totalMultiplier);
            ex.reps = `3 sets of ${scaledReps} reps`;
        } else if (ex.baseDuration) {
            ex.duration = Math.ceil(ex.baseDuration * totalMultiplier);
            ex.sets = level === 'Pro' ? 4 : (level === 'Amateur' ? 3 : 2);
        }
        ex.type = ex.duration ? "timer" : "reps";
        selectedBodyweight.push(ex as Drill);
    }

    const selectedBoxing: Drill[] = [];
    const boxingIndices = Array.from({ length: boxingRoutineExercises.length }, (_, i) => i);
    for (let i = 0; i < boxingCount && boxingIndices.length > 0; i++) {
        const randomIndex = boxingIndices.splice(Math.floor(Math.random() * boxingIndices.length), 1)[0];
        const ex = { ...boxingRoutineExercises[randomIndex] };

        if (ex.baseDuration) {
            ex.duration = 180; // Standard round
            ex.sets = Math.ceil((ex.baseDuration / 180) * totalMultiplier);
            if (ex.sets < 1) ex.sets = 1;
        } else if (ex.baseReps) {
            const scaledReps = Math.ceil(ex.baseReps * totalMultiplier);
            ex.reps = `3 sets of ${scaledReps} reps`;
        }
        ex.type = ex.duration ? "timer" : "reps";
        selectedBoxing.push(ex as Drill);
    }

    return {
        title: `${muscleGroup} Focus - ${level} Level`,
        focus: `Targeting ${muscleGroup} with ${boxingCount} boxing routine drills.`,
        drills: [...selectedBodyweight, ...selectedBoxing]
    };
}

export function getDailyWorkout(dateInput?: Date): Workout {
    const targetDate = dateInput || new Date();
    let baseWorkout = generateDailyWorkout(targetDate);

    if (typeof window === 'undefined') {
        return baseWorkout;
    }

    // Merge Deployed Planner Drills
    const todayKey = targetDate.toDateString();
    const plannerDrillsRaw = localStorage.getItem('deployed_planner_drills_' + todayKey);
    if (plannerDrillsRaw) {
        try {
            const plannerDrills = JSON.parse(plannerDrillsRaw);
            const processedPlannerDrills = plannerDrills.map((d: any) => ({
                name: d.title || d.name,
                duration: parseInt(d.duration) || 180,
                type: "timer",
                isPlanner: true,
                impact: d.impact,
                instruction: d.instruction || "Precision Protocol from AI Roadmap."
            }));

            baseWorkout.drills = [...baseWorkout.drills, ...processedPlannerDrills];
            baseWorkout.focus += " + Planner Protocols Included.";
        } catch (e) {
            console.error("PLANNER_MERGE_ERROR", e);
        }
    }

    // Check for Tactical Session
    const tactical = localStorage.getItem('tactical_session');
    if (tactical) {
        try {
            const tact = JSON.parse(tactical);
            baseWorkout.drills = [...baseWorkout.drills, ...(tact.drills || [])];
            baseWorkout.title = tact.title || baseWorkout.title;
        } catch (e) {
            console.error("DATA_LINK_FAILURE: Could not parse tactical session.");
        }
    }

    return baseWorkout;
}
