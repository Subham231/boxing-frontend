'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Zap, Dumbbell, Wind, Footprints, ShieldHalf, Activity } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const CATEGORIES = [
  { icon: Target, label: 'Technique & Form', tag: 'Core Pillar', desc: 'Sharpen your kinetic chain' },
  { icon: Zap, label: 'Speed & Reflexes', tag: 'Rapid AI Drills', desc: 'Faster hands, slips & reaction' },
  { icon: Dumbbell, label: 'Power & Combos', tag: 'High Velocity', desc: 'Heavy strikes & leverage' },
  { icon: Footprints, label: 'Ring Footwork', tag: 'Tactical IQ', desc: 'Control distance and angles' },
];

const TrainingCategories: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Every workout has a <span className="text-primary">purpose</span>.
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Every session is designed to help you master key boxing skills.
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 content-start my-auto">
        {CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-3 sm:p-4 rounded-3xl border-white/5 bg-black/40 flex flex-col justify-between gap-2"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                {cat.tag && (
                  <span className="text-[7px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {cat.tag}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wide block">{cat.label}</span>
                <span className="text-[9px] text-white/40 font-semibold leading-tight block mt-0.5">{cat.desc}</span>
              </div>
            </motion.div>
          );
        })}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button onClick={nextStep} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2">
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
