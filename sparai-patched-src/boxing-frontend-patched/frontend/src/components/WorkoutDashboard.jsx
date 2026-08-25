import React, { useState, useEffect } from 'react';
import { generateLocalPlanner } from '@/utils/localPlannerEngine';
import { requestLocalNotificationPermission, scheduleLocalWorkoutReminder } from '@/utils/localNotificationService';

export default function WorkoutDashboard() {
    const [isWorkingOut, setIsWorkingOut] = useState(false);
    const [localSchedule, setLocalSchedule] = useState([]);

    // Mock Onboarding State values (Swap these out with your actual OnboardingContext object)
    const mockUserOnboardingData = {
        name: 'Alex',
        daysPerWeek: 3,
        availableMinutes: 30,
        experienceLevel: 'intermediate',
        alertTime: '17:30' // 5:30 PM reminder hook
    };

    useEffect(() => {
        // 1. Compile the custom bodyweight schedule locally instantly
        const plan = generateLocalPlanner({
            daysPerWeek: mockUserOnboardingData.daysPerWeek,
            availableMinutes: mockUserOnboardingData.availableMinutes,
            experienceLevel: mockUserOnboardingData.experienceLevel
        });
        setLocalSchedule(plan);

        // 2. Initialize background notification alarms autonomously
        async function setupAlarms() {
            const allowed = await requestLocalNotificationPermission();
            if (allowed) {
                scheduleLocalWorkoutReminder(mockUserOnboardingData.alertTime, mockUserOnboardingData.name);
            }
        }
        setupAlarms();
    }, []);

    return (
        <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col p-6 font-sans">
            {/* Header Identity Cards */}
            <div className="w-full max-w-md mx-auto mb-6">
                <h1 className="text-xl font-black uppercase tracking-wider text-neutral-100">
                    Tactical Training Hub
                </h1>
                <p className="text-[11px] text-neutral-400 uppercase tracking-widest mt-1">
                    Custom Bodyweight Split • Local Computation Engine
                </p>
            </div>

            {/* Compiled Planner Presentation Module (Matches Cyberpunk Dark Styling) */}
            <div className="w-full max-w-md mx-auto flex flex-col gap-4 mb-8">
                {localSchedule.map((day, dIdx) => (
                    <div key={dIdx} className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                            <span className="text-xs font-black text-cyan-400 uppercase tracking-wide">{day.title}</span>
                            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded-md">{day.duration}</span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            {day.exercises.map((ex, eIdx) => (
                                <div key={eIdx} className="flex flex-col bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-900">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-neutral-200">{ex.name}</span>
                                        <span className="text-[9px] font-mono text-neutral-500 italic">{ex.prescription}</span>
                                    </div>
                                    <span className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 font-medium">
                                        🎯 Target: {ex.target}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Rest of your standard dashboard control buttons/components go right here */}
        </div>
    );
}
