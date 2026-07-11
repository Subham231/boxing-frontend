'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface OnboardingConstraints {
    equipment?: string[];
    injuries?: string;
}

export interface OnboardingData {
    ringName: string;
    phone: string;
    age: number;
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
}

interface OnboardingContextType {
    data: OnboardingData;
    updateData: (newData: Partial<OnboardingData>) => void;
    persistProgress: () => void;
    syncToSupabase: () => Promise<void>;
    nextStep: () => void;
    prevStep: () => void;
    currentStep: number;
    totalSteps: number;
    isLoaded: boolean;
}

const defaultData: OnboardingData = {
    ringName: '',
    phone: '',
    age: 25,
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
        promise: data.promiseWord,
    };
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<OnboardingData>(defaultData);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
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
                    hasCompletedOnboarding: !!stored.onboarding_completed,
                });
            }
        } catch (e) {
            console.error('Failed to load onboarding data:', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const totalSteps = 11;

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
        setCurrentStep(prev => Math.min(prev + 1, totalSteps + 1));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const syncToSupabase = async () => {
        if (typeof window === 'undefined') return;
        const payload = {
            ...serializeOnboarding(data),
            onboarding_completed: true,
            init_timestamp: Date.now(),
        };
        localStorage.setItem('boxing_onboarding_data', JSON.stringify(payload));
        localStorage.setItem('boxing_onboarding_done', 'true');
        updateData({ hasCompletedOnboarding: true });
        console.log('Onboarding saved:', payload);
    };

    return (
        <OnboardingContext.Provider
            value={{ data, updateData, persistProgress, syncToSupabase, nextStep, prevStep, currentStep, totalSteps, isLoaded }}
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
