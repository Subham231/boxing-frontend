'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { ensureUserProfile } from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

import Welcome from './components/Welcome';
import TrainingProblem from './components/TrainingProblem';
import Obstacle from './components/Obstacle';
import FreestyleAnalysis from './components/FreestyleAnalysis';
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
import Commitment from './components/Commitment';
import PromiseStep from './components/Promise';
import OtpVerification from './components/OtpVerification';
import AnalysisMeritsReveal from './components/AnalysisMeritsReveal';
import SubscriptionOffer from './components/SubscriptionOffer';
import FinalPromise from './components/FinalPromise';

const ONBOARDING_ORDER_KEY = 'boxing_onboarding_screen_order';

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
    const router = useRouter();
    const { currentStep, totalSteps, isLoaded, goToStep } = useOnboarding();
    const [middleOrder, setMiddleOrder] = useState<MiddleScreenId[] | null>(null);
    const loginModeHandled = useRef(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyHeight = document.body.style.height;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100dvh';
        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.height = previousBodyHeight;
        };
    }, []);

    // Scroll to top whenever step changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [currentStep]);

    useEffect(() => {
        if (!isLoaded) return;
        setMiddleOrder(getOrCreateMiddleOrder());
    }, [isLoaded]);

    useEffect(() => {
        if (!isLoaded || !middleOrder) return;
        if (new URLSearchParams(window.location.search).get('mode') === 'login') {
            router.replace('/login');
        }
    }, [isLoaded, middleOrder, router]);

    const screens = useMemo(() => {
        if (!middleOrder) return [];
        return [
            <Welcome key="welcome" />,
            <TrainingProblem key="training-problem" />,
            <Obstacle key="obstacle" />,
            <FreestyleAnalysis key="freestyle-analysis" />,
            ...middleOrder
                .filter((id) => id !== 'training-problem' && id !== 'obstacle')
                .map((id) => MIDDLE_COMPONENTS[id]),
            <JourneyStart key="journey" />,
            <Commitment key="commitment" />,
            <Identity key="identity" />,
            <PromiseStep key="promise" />,
            <OtpVerification key="otp" />,
            <AnalysisMeritsReveal key="merits-reveal" />,
            <SubscriptionOffer key="subscription" />,
            <FinalPromise key="finalpromise" />,
        ];
    }, [middleOrder]);

    const percent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

    // Dynamic milestone toast on top of the progression bar (spaced periodically, not rapid)
    const milestoneMessage = useMemo(() => {
        const remaining = totalSteps - currentStep;
        if (currentStep === 1) return 'Getting Started';
        if (remaining === 0 || currentStep >= totalSteps) return 'Final Step — Entering Ring!';
        if (remaining <= 3) return `Almost there! Just ${remaining} more to go`;
        if (percent >= 80) return 'Nearly Done — Finalizing Protocol';
        if (percent >= 50 && percent < 60) return 'Halfway there, fighter!';
        if (percent >= 25 && percent < 35) return 'Building your combat profile...';
        return null;
    }, [currentStep, totalSteps, percent]);

    if (!isLoaded || !middleOrder) {
        return (
            <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-bg-dark p-6 gap-4 scrollbar-hide">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col items-center overflow-hidden bg-[#0a0a0c] p-4 sm:p-6 scrollbar-hide">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    ref={scrollContainerRef}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-full max-w-lg h-full overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col overscroll-contain"
                >
                    {screens[currentStep - 1] || <FinalPromise />}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Progression Bar - kept low enough not to cover CTA buttons */}
            <div className="fixed bottom-3 sm:bottom-4 left-0 right-0 max-w-lg mx-auto px-6 sm:px-8 z-10 pointer-events-none flex flex-col gap-1.5">
                {/* Milestone Toast Tag */}
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/50">
                    <AnimatePresence mode="wait">
                        {milestoneMessage ? (
                            <motion.div
                                key={milestoneMessage}
                                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black shadow-[0_0_10px_rgba(226,255,59,0.2)]"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {milestoneMessage}
                            </motion.div>
                        ) : (
                            <span className="text-[8px] text-white/30 tracking-widest">TACTICAL ONBOARDING</span>
                        )}
                    </AnimatePresence>

                    <span className="text-[9px] font-black text-primary drop-shadow-[0_0_8px_rgba(226,255,59,0.5)]">
                        {percent}%
                    </span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5 backdrop-blur-md">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary/80 via-primary to-yellow-300 rounded-full shadow-[0_0_10px_rgba(226,255,59,0.6)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading } = useFirebaseUser();
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [onboardingStateLoaded, setOnboardingStateLoaded] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            setOnboardingComplete(false);
            setOnboardingStateLoaded(true);
            return;
        }

        let cancelled = false;

        // Check the real Supabase profile, not just localStorage — a user
        // who already finished onboarding on another device/browser (or
        // after clearing storage) should never be dropped back into this
        // flow just because the local flag isn't set here.
        ensureUserProfile(user)
            .then(({ profile }) => {
                if (cancelled) return;
                const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
                const complete =
                    !!onboardingData.onboarding_completed ||
                    !!profile.uid ||
                    !!profile.phone ||
                    localStorage.getItem('boxing_onboarding_done') === 'true';
                cacheProfileLocally(profile);
                if (complete) localStorage.setItem('boxing_onboarding_done', 'true');
                setOnboardingComplete(complete);
            })
            .catch(() => {
                if (cancelled) return;
                try {
                    const storedData = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
                    const complete = localStorage.getItem('boxing_onboarding_done') === 'true' || storedData.onboarding_completed === true;
                    setOnboardingComplete(complete);
                } catch {
                    setOnboardingComplete(false);
                }
            })
            .finally(() => {
                if (!cancelled) setOnboardingStateLoaded(true);
            });

        return () => { cancelled = true; };
    }, [loading, user]);

    useEffect(() => {
        if (!loading && onboardingStateLoaded && user && onboardingComplete) {
            router.replace('/dashboard');
        }
    }, [loading, onboardingComplete, onboardingStateLoaded, router, user]);

    if (loading || !onboardingStateLoaded || (user && onboardingComplete)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-bg-dark">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <OnboardingProvider>
            <OnboardingFlow />
        </OnboardingProvider>
    );
}
