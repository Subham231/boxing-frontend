'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

export const ONBOARDING_ORDER_KEY = 'boxing_onboarding_screen_order';

/** Middle pool — interactive quiz + static pitch screens, shuffled each new run */
const MIDDLE_SCREEN_IDS = [
    'training-problem',
    'obstacle',
    'favorite-fighter',
    'motivation',
    'future-self',
    'commitment-level',
    'boxing-mindset',
    'superpower',
    'future-progress-preview',
    'future-progress',
    'training-categories',
    'structured-program',
    'performance-tracking',
    'personalization',
    'daily-consistency',
    'ecosystem',
] as const;

type MiddleScreenId = (typeof MIDDLE_SCREEN_IDS)[number];

function shuffleIds(ids: MiddleScreenId[]): MiddleScreenId[] {
    const next = [...ids];
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function isValidOrder(ids: unknown): ids is MiddleScreenId[] {
    if (!Array.isArray(ids) || ids.length !== MIDDLE_SCREEN_IDS.length) return false;
    const set = new Set(ids);
    return MIDDLE_SCREEN_IDS.every((id) => set.has(id));
}

function getOrCreateMiddleOrder(): MiddleScreenId[] {
    try {
        const stored = JSON.parse(localStorage.getItem(ONBOARDING_ORDER_KEY) || 'null');
        if (isValidOrder(stored)) return stored;
    } catch {
        /* ignore */
    }
    const order = shuffleIds([...MIDDLE_SCREEN_IDS]);
    localStorage.setItem(ONBOARDING_ORDER_KEY, JSON.stringify(order));
    return order;
}

const MIDDLE_COMPONENTS: Record<MiddleScreenId, React.ReactNode> = {
    'training-problem': <TrainingProblem key="training-problem" />,
    obstacle: <Obstacle key="obstacle" />,
    'favorite-fighter': <FavoriteFighter key="favorite-fighter" />,
    motivation: <Motivation key="motivation" />,
    'future-self': <FutureSelf key="future-self" />,
    'commitment-level': <CommitmentLevel key="commitment-level" />,
    'boxing-mindset': <BoxingMindset key="boxing-mindset" />,
    superpower: <Superpower key="superpower" />,
    'future-progress-preview': <FutureProgressPreview key="future-progress-preview" />,
    'future-progress': <FutureProgress key="future-progress" />,
    'training-categories': <TrainingCategories key="training-categories" />,
    'structured-program': <StructuredProgram key="structured-program" />,
    'performance-tracking': <PerformanceTracking key="performance-tracking" />,
    personalization: <Personalization key="personalization" />,
    'daily-consistency': <DailyConsistency key="daily-consistency" />,
    ecosystem: <Ecosystem key="ecosystem" />,
};

const OnboardingFlow: React.FC = () => {
    const { currentStep, totalSteps, isLoaded } = useOnboarding();
    const [middleOrder, setMiddleOrder] = useState<MiddleScreenId[] | null>(null);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        setMiddleOrder(getOrCreateMiddleOrder());
    }, [isLoaded]);

    const screens = useMemo(() => {
        if (!middleOrder) return [];
        return [
            <Welcome key="welcome" />,
            ...middleOrder.map((id) => MIDDLE_COMPONENTS[id]),
            <JourneyStart key="journey" />,
            <Identity key="identity" />,
            <PromiseStep key="promise" />,
            <OtpVerification key="otp" />,
            <SubscriptionOffer key="subscription" />,
            <FinalPromise key="finalpromise" />,
        ];
    }, [middleOrder]);

    if (!isLoaded || !middleOrder) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-bg-dark gap-4 overflow-hidden scrollbar-hide">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-16 bg-[#0a0a0c] h-dvh max-h-dvh overflow-hidden scrollbar-hide">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-full max-w-lg h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
                >
                    {screens[currentStep - 1] || <FinalPromise />}
                </motion.div>
            </AnimatePresence>

            <div className="fixed bottom-10 left-0 right-0 px-10 flex gap-1 pointer-events-none">
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
