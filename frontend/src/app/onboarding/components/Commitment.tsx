'use client';

import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { ChevronRight } from 'lucide-react';

// Fixed step (not part of the shuffled MIDDLE_SCREEN_IDS pool) — every new
// user sees this exact screen, in this exact position, right before
// "Set up your identity". The word itself is whatever the user types; it's
// the screen's presence/position that's fixed, not the word's content.
const Commitment: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    return (
        <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
            <header className="text-left mb-4 sm:mb-6">
                <StepBadge />
                <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    The <span className="text-primary">Commitment</span>.
                </h1>
                <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
                    Training is 10% physical, 90% mental. Define the word that will guide you when the rounds get tough.
                </p>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center gap-4 my-auto">
                <div className="w-full relative">
                    <input
                        type="text"
                        placeholder="DISCIPLINE"
                        value={data.promiseWord}
                        onChange={(e) => updateData({ promiseWord: e.target.value.toUpperCase().slice(0, 24) })}
                        className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary text-center text-3xl sm:text-4xl font-black py-3 sm:py-4 outline-none tracking-widest placeholder:opacity-10 transition-all uppercase text-white"
                        autoFocus
                    />
                    <div className="text-center text-[9px] uppercase tracking-[0.3em] text-primary/40 font-mono mt-3 sm:mt-4">
                        Enter your terminal promise word
                    </div>
                </div>
            </main>

            <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={nextStep}
                    disabled={!data.promiseWord || data.promiseWord.trim().length < 3}
                    className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    I PROMISE <ChevronRight size={20} />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Commitment;
