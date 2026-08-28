import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/context/OnboardingContext';

const Launch: React.FC = () => {
    const router = useRouter();
    const { data, syncToSupabase } = useOnboarding();
    const [isLaunching, setIsLaunching] = useState(false);

    const handleLaunch = async () => {
        setIsLaunching(true);
        await syncToSupabase();
        router.replace('/dashboard');
    };

    const focusLabel = data.goals.length > 0 ? data.goals.join(' ??? ') : data.primary_goal;

    return (
        <div className="flex flex-col items-center text-center gap-8">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" />
                </svg>
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold uppercase tracking-tighter">Profile Ready</h2>
                <p className="text-text-muted">The SPARAI Strategist has mapped your biometric data.</p>
            </div>

            <div className="glass-card w-full p-6 text-left border-primary/10">
                <div className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-widest text-primary/60 mb-4">
                    <span>// FIGHTER SUMMARY</span>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase text-text-muted">Ring Name</span>
                        <span className="text-xl font-bold italic">{data.ringName || 'FIGHTER'}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase text-text-muted">Focus</span>
                        <span className="text-xs font-bold uppercase">{focusLabel}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase text-text-muted">Level</span>
                        <span className="text-xs font-bold uppercase">{data.experience_level || '???'}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase text-text-muted">Biometrics</span>
                        <span className="text-xs font-bold uppercase">
                            {data.height}CM / {data.weight}KG
                        </span>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={handleLaunch}
                disabled={isLaunching}
                className="btn-primary w-full mt-8 flex items-center justify-center gap-4 group"
            >
                {isLaunching ? 'SYNCING DATA...' : (
                    <>
                        LAUNCH PROTOCOL
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="group-hover:translate-x-1 transition-transform"
                        >
                            <path d="M13 5l7 7-7 7M5 12h14" />
                        </svg>
                    </>
                )}
            </button>
        </div>
    );
};

export default Launch;  