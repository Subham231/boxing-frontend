import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';

const Commitment: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    return (
        <div className="flex flex-col items-center text-center gap-8">
            <div className="w-16 h-1 bg-primary/30" />
            <h2 className="text-3xl font-bold uppercase tracking-tighter">The Commitment</h2>
            <p className="text-text-muted">
                Training is 10% physical, 90% mental. Define the word that will guide you when the rounds get tough.
            </p>

            <div className="w-full relative">
                <input
                    type="text"
                    placeholder="DISCIPLINE"
                    value={data.promiseWord}
                    onChange={(e) => updateData({ promiseWord: e.target.value.toUpperCase() })}
                    className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary text-center text-4xl font-black py-4 outline-none tracking-widest placeholder:opacity-10 transition-all uppercase"
                    autoFocus
                />
                <div className="absolute -bottom-6 left-0 right-0 text-[10px] uppercase tracking-[0.3em] text-primary/40 font-mono">
                    Enter your terminal promise word
                </div>
            </div>

            <div className="flex flex-col w-full gap-4 mt-12">
                <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary w-full"
                    disabled={!data.promiseWord || data.promiseWord.length < 3}
                >
                    I PROMISE
                </button>
                <button type="button" onClick={prevStep} className="text-text-muted hover:text-white transition-colors">
                    BACK
                </button>
            </div>
        </div>
    );
};

export default Commitment;
