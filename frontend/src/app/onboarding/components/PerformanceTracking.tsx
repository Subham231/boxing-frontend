'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { SampleTag, AnimatedRing, AnimatedCounter } from './OnboardingCharts';

const PerformanceTracking: React.FC = () => {
    const { nextStep, prevStep } = useOnboarding();

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6 flex items-start justify-between">
                <div>
                    <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">06 / 12</div>
                    <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                        Small improvements <br /> become <span className="text-primary">visible</span>.
                    </h1>
                </div>
            </header>

            <main className="flex-1 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-wide">Fighter Dashboard</span>
                    <SampleTag />
                </div>

                <div className="glass-card p-5 rounded-3xl border-white/5 bg-black/40 flex justify-around">
                    <AnimatedRing percent={78} label="Weekly Completion" />
                    <AnimatedRing percent={64} label="Technique Score" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
                        <AnimatedCounter value={14} label="Day Streak" />
                    </div>
                    <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
                        <AnimatedCounter value={47} label="Sessions Completed" />
                    </div>
                    <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
                        <AnimatedCounter value={2840} suffix="+" label="Punch Count" />
                    </div>
                    <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
                        <AnimatedCounter value={6120} suffix=" kcal" label="Estimated Calories" />
                    </div>
                </div>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
                    CONTINUE <ChevronRight size={20} />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default PerformanceTracking;