'use client';

import React from 'react';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import Welcome from './components/Welcome';
import Problem from './components/Problem';
import FocusGoals from './components/FocusGoals';
import Solution from './components/Solution';
import TimeSlot from './components/TimeSlot';
import GearCheck from './components/GearCheck';
import FightingStance from './components/FightingStance';
import CoreDriver from './components/CoreDriver';
import Intensity from './components/Intensity';
import Frequency from './components/Frequency';
import PromiseStep from './components/Promise';

const OnboardingFlow: React.FC = () => {
    const { currentStep, totalSteps, isLoaded } = useOnboarding();

    const screens = [
        <Welcome key="welcome" />,
        <Problem key="problem" />,
        <FocusGoals key="focusgoals" />,
        <Solution key="solution" />,
        <TimeSlot key="timeslot" />,
        <GearCheck key="gearcheck" />,
        <FightingStance key="stance" />,
        <CoreDriver key="driver" />,
        <Intensity key="intensity" />,
        <Frequency key="frequency" />,
        <PromiseStep key="promise" />,
    ];

    if (!isLoaded) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-bg-dark gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0c] min-h-screen">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-full max-w-lg"
                >
                    {screens[currentStep - 1] || <PromiseStep />}
                </motion.div>
            </AnimatePresence>

            <div className="fixed bottom-10 left-0 right-0 px-10 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-[2px] flex-1 transition-all duration-500 ${
                            i + 1 <= Math.min(currentStep, totalSteps) ? 'bg-primary' : 'bg-white/10'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default function OnboardingPage() {
    return (
        <OnboardingProvider>
            <OnboardingFlow />
        </OnboardingProvider>
    );
}
