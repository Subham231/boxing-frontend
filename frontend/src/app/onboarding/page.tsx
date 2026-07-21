'use client';

import React from 'react';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import Welcome from './components/Welcome';
import TrainingProblem from './components/TrainingProblem';
import Obstacle from './components/Obstacle';
import FavoriteFighter from './components/FavoriteFighter';
import Motivation from './components/Motivation';
import FutureSelf from './components/FutureSelf';
import CommitmentLevel from './components/CommitmentLevel';
import BoxingMindset from './components/BoxingMindset';
import Superpower from './components/Superpower';
import FutureProgressPreview from './components/FutureProgressPreview';
import FutureProgress from './components/FutureProgress';
import TrainingCategories from './components/TrainingCategories';
import StructuredProgram from './components/StructuredProgram';
import PerformanceTracking from './components/PerformanceTracking';
import Personalization from './components/Personalization';
import DailyConsistency from './components/DailyConsistency';
import Ecosystem from './components/Ecosystem';
import JourneyStart from './components/JourneyStart';
import Identity from './components/Problem';
import PromiseStep from './components/Promise';
import OtpVerification from './components/OtpVerification';
import SubscriptionOffer from './components/SubscriptionOffer';
import FinalPromise from './components/FinalPromise';

const OnboardingFlow: React.FC = () => {
    const { currentStep, totalSteps, isLoaded } = useOnboarding();

    const screens = [
        <Welcome key="welcome" />,
        <TrainingProblem key="problem" />,
        <Obstacle key="obstacle" />,
        <FavoriteFighter key="fighter" />,
        <Motivation key="motivation" />,
        <FutureSelf key="futureself" />,
        <CommitmentLevel key="commitment" />,
        <BoxingMindset key="mindset" />,
        <Superpower key="superpower" />,
        <FutureProgressPreview key="progresspreview" />,
        <FutureProgress key="progress" />,
        <TrainingCategories key="categories" />,
        <StructuredProgram key="program" />,
        <PerformanceTracking key="tracking" />,
        <Personalization key="personalization" />,
        <DailyConsistency key="consistency" />,
        <Ecosystem key="ecosystem" />,
        <JourneyStart key="journey" />,
        <Identity key="identity" />,
        <PromiseStep key="promise" />,
        <OtpVerification key="otp" />,
        <SubscriptionOffer key="subscription" />,
        <FinalPromise key="finalpromise" />,
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
                    {screens[currentStep - 1] || <FinalPromise />}
                </motion.div>
            </AnimatePresence>

            <div className="fixed bottom-10 left-0 right-0 px-10 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-[2px] flex-1 transition-all duration-500 ${i + 1 <= Math.min(currentStep, totalSteps) ? 'bg-primary' : 'bg-white/10'
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