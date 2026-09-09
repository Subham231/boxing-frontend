'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { FitnessBaseline } from '@/types';

export interface OnboardingConstraints {
    equipment?: string[];
    injuries?: string;
}

export interface OnboardingData {
    ringName: string;
    phone: string;
    age: number;
    profession: string;
    height: number;
    weight: number;
    goals: string[];
    promiseWord: string;
    hasCompletedOnboarding: boolean;
    primary_goal: string;
    experience_level: string;
    available_time: number;
    constraints: OnboardingConstraints;
    stance: string;
    trigger: string;
    intensity: number;
    frequency: number;
    daysPerWeek: number;
    combatFocus: string;
    fitnessBaseline: FitnessBaseline;
    favoriteFighter?: string;
    motivations?: string[];
    futureSelf?: string;
    commitmentLevel?: number;
    boxingMindset?: string;
    biggestObstacle?: string;
    trainingSuperpower?: string;
}

interface OnboardingContextType {
    data: OnboardingData;
    updateData: (newData: Partial<OnboardingData>) => void;
    persistProgress: () => void;
    syncToSupabase: () => Promise<void>;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    currentStep: number;
    totalSteps: number;
    isLoaded: boolean;
}

const defaultData: OnboardingData = {
    ringName: '',
    phone: '+91',
    age: 25,
    profession: '',
    height: 175,
    weight: 75,
    goals: [],
    promiseWord: '',
    hasCompletedOnboarding: false,
    primary_goal: 'Aerial',
    experience_level: '',
    available_time: 45,
    constraints: { equipment: [], injuries: '' },
    stance: 'Orthodox',
    trigger: 'Pro Ambitions',
    intensity: 3,
    frequency: 3,
    daysPerWeek: 3,
    combatFocus: '',
    fitnessBaseline: { pushupMax: '', boxingExperience: '' },
};

function serializeOnboarding(data: OnboardingData): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    const avatar = localStorage.getItem('boxing_user_avatar');
    const goals = data.goals.length > 0 ? data.goals : (data.primary_goal ? [data.primary_goal] : []);

    return {
        ring_name: data.ringName.trim().toUpperCase(),
        phone_number: data.phone.trim(),
        ...(avatar ? { avatar_url: avatar } : {}),
        user_metrics: {
            age: Number(data.age),
            weight: Number(data.weight),
            height: Number(data.height),
        },
        primary_goal: data.primary_goal,
        goals,
        experience_level: data.experience_level,
        available_time: data.available_time,
        constraints: data.constraints,
        stance: data.stance,
        trigger: data.trigger,
        intensity: data.intensity,
        frequency: data.frequency,
        daysPerWeek: data.daysPerWeek,
        combatFocus: data.combatFocus,
        fitnessBaseline: data.fitnessBaseline,
        promise: data.promiseWord,
    };
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const TOTAL_STEPS = 18;

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<OnboardingData>(defaultData);
    const [isLoaded, setIsLoaded] = useState(false);

    // Intentionally left empty — step restoration is merged into the data useEffect below
    // to avoid the two-render flash where step starts at 1 then jumps to the saved step.

    async function getFirebaseIdToken(): Promise<string | null> {
        try {
            const { firebaseAuth } = await import('@/lib/firebase');
            const user = firebaseAuth.currentUser;
            if (!user) return null;
            return user.getIdToken();
        } catch {
            return null;
        }
    }

    useEffect(() => {
        try {
            // Restore saved data
            const stored = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
            if (stored && Object.keys(stored).length > 0) {
                setData({
                    ...defaultData,
                    ringName: stored.ring_name || '',
                    phone: stored.phone_number || '',
                    age: stored.user_metrics?.age ?? defaultData.age,
                    height: stored.user_metrics?.height ?? defaultData.height,
                    weight: stored.user_metrics?.weight ?? defaultData.weight,
                    goals: stored.goals || [],
                    promiseWord: stored.promise || '',
                    primary_goal: stored.primary_goal || defaultData.primary_goal,
                    experience_level: stored.experience_level || '',
                    available_time: stored.available_time ?? defaultData.available_time,
                    constraints: stored.constraints || defaultData.constraints,
                    stance: stored.stance || defaultData.stance,
                    trigger: stored.trigger || defaultData.trigger,
                    intensity: stored.intensity ?? defaultData.intensity,
                    frequency: stored.frequency ?? defaultData.frequency,
                    daysPerWeek: stored.daysPerWeek ?? defaultData.daysPerWeek,
                    combatFocus: stored.combatFocus || defaultData.combatFocus,
                    fitnessBaseline: stored.fitnessBaseline || defaultData.fitnessBaseline,
                    hasCompletedOnboarding: !!stored.onboarding_completed,
                });
            }

            // Restore saved step in the same effect to prevent a flash to step 1
            const storedStep = localStorage.getItem('boxing_onboarding_step');
            if (storedStep) {
                const step = parseInt(storedStep, 10);
                if (!isNaN(step) && step >= 1 && step <= TOTAL_STEPS) {
                    setCurrentStep(step);
                }
            }
        } catch (e) {
            console.error('Failed to restore onboarding state:', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const totalSteps = TOTAL_STEPS;

    const updateData = (newData: Partial<OnboardingData>) => {
        setData(prev => {
            const next = { ...prev, ...newData };
            if (newData.primary_goal) {
                next.goals = [newData.primary_goal];
            }
            return next;
        });
    };

    const persistProgress = useCallback(() => {
        if (typeof window === 'undefined') return;
        const existing = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
        const merged = { ...existing, ...serializeOnboarding(data) };
        localStorage.setItem('boxing_onboarding_data', JSON.stringify(merged));
    }, [data]);

    const nextStep = () => {
        persistProgress();
        setCurrentStep(prev => {
            const next = Math.min(prev + 1, totalSteps + 1);
            if (typeof window !== 'undefined') {
                localStorage.setItem('boxing_onboarding_step', String(next));
            }
            return next;
        });
    };

    const prevStep = () => setCurrentStep(prev => {
        const next = Math.max(prev - 1, 1);
        if (typeof window !== 'undefined') {
            localStorage.setItem('boxing_onboarding_step', String(next));
        }
        return next;
    });

    // Used by the "Already have an account? Login" shortcut on the Welcome
    // screen — jumps straight to the OTP verification step (which already
    // correctly detects and restores an existing account) instead of
    // running a second, separate auth implementation.
    const goToStep = (step: number) => {
        persistProgress();
        setCurrentStep(prev => {
            const next = Math.max(1, Math.min(step, totalSteps + 1));
            if (typeof window !== 'undefined') {
                localStorage.setItem('boxing_onboarding_step', String(next));
            }
            return next;
        });
    };

    const syncToSupabase = async () => {
        if (typeof window === 'undefined') return;
        const serialized = serializeOnboarding(data);
        const payload = {
            ...serialized,
            ringName: data.ringName,
            ring_name: data.ringName,
            age: Number(data.age),
            profession: data.profession,
            promise: data.promiseWord,
            promise_trigger: data.promiseWord,
            onboarding_completed: true,
            init_timestamp: Date.now(),
        };
        // Persist the full onboarding payload and individual fields to Supabase
        const token = await getFirebaseIdToken();
        if (!token) throw new Error('Authentication expired. Please log in again.');
        const avatar = localStorage.getItem('boxing_user_avatar') || undefined;
        const response = await fetch('/api/reflex/save-profile-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                displayName: data.ringName,
                phone: data.phone,
                age: Number(data.age),
                profession: data.profession,
                promiseWord: data.promiseWord,
                avatarUrl: avatar,
                onboardingData: payload,
            }),
        });
        if (!response.ok) {
            const failure = await response.json().catch(() => ({}));
            throw new Error(failure.error || 'Could not save your fighter profile.');
        }

        localStorage.setItem('boxing_onboarding_data', JSON.stringify(payload));
        localStorage.setItem('boxing_onboarding_done', 'true');
        localStorage.removeItem('boxing_onboarding_screen_order');
        localStorage.removeItem('boxing_onboarding_step'); // clear saved step so re-entry starts fresh
        updateData({ hasCompletedOnboarding: true });
    };

    return (
        <OnboardingContext.Provider
            value={{ data, updateData, persistProgress, syncToSupabase, nextStep, prevStep, goToStep, currentStep, totalSteps, isLoaded }}
        >
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};