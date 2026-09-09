'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Zap } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { useRouter } from 'next/navigation';

const Welcome: React.FC = () => {
    const { nextStep } = useOnboarding();
    const router = useRouter();

    // Screen order (see onboarding/page.tsx): ... PromiseStep,
    // OtpVerification, SubscriptionOffer, FinalPromise — OTP is three steps
    // from the end.
    return (
        <div className="relative flex flex-col min-h-full justify-between py-4 pb-20 sm:pb-24">
            {/* Ambient particles */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 18 }).map((_, i) => (
                    <motion.span
                        key={i}
                        className="absolute rounded-full bg-primary/40"
                        style={{
                            width: 2 + (i % 3),
                            height: 2 + (i % 3),
                            left: `${(i * 37) % 100}%`,
                            top: `${(i * 53) % 100}%`,
                        }}
                        animate={{ opacity: [0.1, 0.6, 0.1], y: [0, -14, 0] }}
                        transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.2 }}
                    />
                ))}
            </div>

            {/* Cinematic silhouette glow */}
            <motion.div
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute inset-0 flex items-end justify-center"
            >
                <div className="w-[70%] h-[65%] bg-gradient-to-t from-primary/10 via-white/[0.02] to-transparent rounded-t-[50%] blur-2xl" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="relative z-10 flex items-center gap-2"
            >
                <span className="text-lg font-black italic uppercase tracking-tight text-white">
                    Spar<span className="text-primary">ai</span>
                </span>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative z-10 flex items-center gap-2"
            >
                <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-black tracking-[3px] text-primary uppercase">Your AI Boxing Coach</span>
            </motion.div>

            <motion.header
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
                className="relative z-10 text-left mt-8 sm:mt-12"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[9px] font-black uppercase tracking-widest mb-4">
                    <Zap className="w-3.5 h-3.5" />
                    <span>SPARAI PROTOCOL</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase leading-[0.92] tracking-tighter text-white max-w-xl">
                    Let&apos;s build <br />
                    <span className="text-primary">your fighter.</span>
                </h1>
                <p className="text-white/70 mt-6 text-base sm:text-lg italic leading-relaxed font-semibold max-w-md border-l-2 border-primary/50 pl-4">
                    &ldquo;Your training will be built around how you fight, what you want, and who you want to become.&rdquo;
                </p>
            </motion.header>

            <motion.footer
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="relative z-30 mt-10 pb-6 mb-8"
            >
                <div className="flex flex-col gap-3">
                    <button
                        onClick={nextStep}
                        className="w-full h-14 sm:h-16 flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-[#d4f52e] text-[#10130a] font-black uppercase tracking-[0.2em] text-sm sm:text-base shadow-[0_10px_40px_rgba(226,255,59,0.35)] transition-all hover:-translate-y-0.5 active:scale-98"
                    >
                        START <ChevronRight size={22} />
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:border-primary/40 font-black uppercase tracking-[0.12em] text-[11px] transition-all"
                    >
                        ALREADY HAVE AN ACCOUNT — LOG IN <ChevronRight size={18} />
                    </button>
                </div>
            </motion.footer>
        </div>
    );
};

export default Welcome;