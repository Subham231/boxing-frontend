'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Zap, Dumbbell, Wind, Footprints, ShieldHalf, Activity } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const CATEGORIES = [
    { icon: Target, label: 'Technique', desc: 'Sharpen your form' },
    { icon: Zap, label: 'Speed', desc: 'Faster hands & feet' },
    { icon: Dumbbell, label: 'Power', desc: 'Hit harder' },
    { icon: Wind, label: 'Conditioning', desc: 'Go the distance' },
    { icon: Footprints, label: 'Footwork', desc: 'Control the ring' },
    { icon: ShieldHalf, label: 'Defense', desc: 'Slip & guard' },
    { icon: Activity, label: 'Mobility', desc: 'Stay injury-free' },
];

const TrainingCategories: React.FC = () => {
    const { nextStep, prevStep } = useOnboarding();

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">04 / 12</div>
                <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    Every workout has a <span className="text-primary">purpose</span>.
                </h1>
                <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
                    Every session is designed to help you improve a specific part of your boxing performance.
                </p>
            </header>

            <main className="flex-1 grid grid-cols-2 gap-3 content-start">
                {CATEGORIES.map((cat, i) => {
                    const Icon = cat.icon;
                    return (
                        <motion.div
                            key={cat.label}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                            className="glass-card p-4 rounded-3xl border-white/5 bg-black/40 flex flex-col gap-2"
                        >
                            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-wide">{cat.label}</span>
                            <span className="text-[9px] text-white/40 font-semibold leading-tight">{cat.desc}</span>
                        </motion.div>
                    );
                })}
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

export default TrainingCategories;