'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Dumbbell, Swords, Heart, Target, Sparkles, Trophy, Shield, Flame } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const DRIVERS = [
  { icon: Swords, label: 'Become a better boxer', tag: 'Most Popular' },
  { icon: Dumbbell, label: 'Get stronger & leaner', tag: 'Recommended' },
  { icon: Target, label: 'Build iron discipline', tag: 'Best Choice' },
  { icon: Sparkles, label: 'Gain fighting confidence', tag: 'High Impact' },
  { icon: Trophy, label: 'Prepare for sparring', tag: 'Pro Focus' },
  { icon: Shield, label: 'Learn self-defense', tag: 'Essential' },
];

const MAX_SELECT = 3;

const Motivation: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(
    data.motivations && data.motivations.length > 0 ? data.motivations : ['Become a better boxer', 'Get stronger & leaner']
  );

  const toggle = (label: string) => {
    setSelected((prev) => {
      let next: string[];
      if (prev.includes(label)) {
        next = prev.filter((v) => v !== label);
      } else if (prev.length < MAX_SELECT) {
        next = [...prev, label];
      } else {
        next = prev;
      }
      updateData({ motivations: next });
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Why are you stepping into <span className="text-primary">the ring</span>?
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Choose up to 3 drivers that push you forward.
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 content-start my-auto">
        {DRIVERS.map((d) => {
          const active = selected.includes(d.label);
          const Icon = d.icon;
          return (
            <motion.button
              key={d.label}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(d.label)}
              className={`relative flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-3xl border text-center transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              {d.tag && (
                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full mb-1 ${
                  active ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                }`}>
                  {d.tag}
                </span>
              )}
              <Icon className={`w-5 h-5 my-1 ${active ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
              <span className={`text-[10px] font-black uppercase leading-tight ${active ? 'text-primary' : 'text-white/70'}`}>{d.label}</span>
            </motion.button>
          );
        })}
      </main>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-[11px] font-bold text-primary/80 italic mt-3"
          >
            We'll keep these goals in mind throughout your journey.
          </motion.p>
        )}
      </AnimatePresence>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button onClick={nextStep} disabled={!selected.length} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-40">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default Motivation;
