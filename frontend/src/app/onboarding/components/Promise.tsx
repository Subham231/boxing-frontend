'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Power, Check } from 'lucide-react';

const FEATURES = [
    'Personalized Tactical Protocols',
    'Advanced Progress Analytics',
    'Interactive Performance Graphs',
    'Unlimited Planner Regeneration',
    'Daily Grind Tracking',
    'Workout History',
    'Goal Tracking',
    'Recovery Insights',
    'Performance Statistics',
    'Future Premium Features',
];

const Promise: React.FC = () => {
    const { nextStep, prevStep } = useOnboarding();
    const [accepted, setAccepted] = useState(false);

    const handleInitialize = () => {
        if (!accepted) {
            alert('The protocol requires your commitment. Accept the promise.');
            return;
        }
        nextStep();
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">20 / 22</div>
                <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    The Fighter&apos;s <span className="text-primary">Promise</span>
                </h1>
                <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
                    Here&apos;s everything unlocked the moment you begin.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-5 overflow-y-auto scrollbar-hide">
                <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40 flex flex-col gap-2.5">
                    {FEATURES.map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wide">{f}</span>
                        </div>
                    ))}
                </div>

                <div className="glass-card relative p-6 border-primary/40 bg-black/60 rounded-3xl">
                    <div className="absolute -top-2.5 left-5 bg-primary text-black text-[10px] font-black px-3 py-0.5 rounded uppercase tracking-wider">
                        Sacred Oath
                    </div>
                    <p className="text-base leading-relaxed text-white italic uppercase font-bold tracking-wide mt-2">
                        &ldquo;I understand this is not a game. I promise to show up, log my sweat, and
                        never break my streak.&rdquo;
                    </p>
                </div>

                <label className="flex items-center gap-4 cursor-pointer mt-1">
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        className="w-7 h-7 accent-[#E2FF3B] cursor-pointer"
                    />
                    <span className="text-sm font-black text-primary uppercase tracking-wide">I ACCEPT THE TERMS</span>
                </label>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    type="button"
                    onClick={handleInitialize}
                    disabled={!accepted}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    INITIALIZE SYSTEM <Power size={22} />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Promise;
