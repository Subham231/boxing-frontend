'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const JourneyStart: React.FC = () => {
    const { nextStep, prevStep } = useOnboarding();

    return (
        <div className="relative flex flex-col min-h-[85vh] justify-between py-4 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 14 }).map((_, i) => (
                    <motion.span
                        key={i}
                        className="absolute rounded-full bg-primary/30"
                        style={{ width: 2, height: 2, left: `${(i * 41) % 100}%`, top: `${(i * 29) % 100}%` }}
                        animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -10, 0] }}
                        transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
                    />
                ))}
            </div>

            <div className="relative z-10">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">10 / 12</div>
            </div>

            <motion.header
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative z-10 text-left"
            >
                <h1 className="text-4xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    Every champion started <br /> with <span className="text-primary">Day One</span>.
                </h1>
                <p className="text-white/50 mt-5 text-sm leading-relaxed font-semibold pr-4">
                    The only workout you'll regret is the one you never started.
                </p>
            </motion.header>

            <motion.footer
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative z-10 mt-10 flex flex-col gap-4"
            >
                <button
                    onClick={nextStep}
                    className="btn-primary w-full h-16 flex items-center justify-center gap-2 shadow-[0_10px_40px_rgba(226,255,59,0.25)]"
                >
                    CREATE MY TRAINING PLAN <ChevronRight size={20} />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
                    Back
                </button>
            </motion.footer>
        </div>
    );
};

export default JourneyStart;