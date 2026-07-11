import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/context/OnboardingContext';
import { Power } from 'lucide-react';

const Promise: React.FC = () => {
    const router = useRouter();
    const { nextStep, prevStep, syncToSupabase } = useOnboarding();
    const [accepted, setAccepted] = useState(false);
    const [launching, setLaunching] = useState(false);

    const handleInitialize = async () => {
        if (!accepted) {
            alert('The protocol requires your commitment. Accept the promise.');
            return;
        }
        setLaunching(true);
        await syncToSupabase();
        router.replace('/dashboard');
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">FINAL STEP</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">
                    The Fighter&apos;s <br /> <span className="text-primary italic font-black">Promise</span>
                </h1>
            </header>

            <main className="flex-1 flex flex-col justify-center gap-6">
                <div className="glass-card relative p-8 border-primary/40 bg-black/60">
                    <div className="absolute -top-2.5 left-5 bg-primary text-black text-[10px] font-black px-3 py-0.5 rounded uppercase tracking-wider">
                        Sacred Oath
                    </div>
                    <p className="text-lg leading-relaxed text-white italic uppercase font-bold tracking-wide mt-2">
                        &ldquo;I UNDERSTAND THAT THIS IS NOT A GAME. THE AI BOXING PROTOCOL IS A HIGH-STREAK PERFORMANCE
                        ENGINE. I PROMISE TO SHOW UP, LOG MY SWEAT, AND NEVER BREAK MY STREAK.&rdquo;
                    </p>
                </div>

                <label className="flex items-center gap-4 cursor-pointer mt-2">
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
                    disabled={launching || !accepted}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {launching ? 'CALIBRATING...' : (
                        <>
                            INITIALIZE SYSTEM <Power size={22} />
                        </>
                    )}
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Promise;
