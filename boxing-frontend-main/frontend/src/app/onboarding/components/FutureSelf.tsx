'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Trophy, Swords, Zap, Flame, Dumbbell, Brain, Sparkles, Heart } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const FUTURES = [
  { icon: Swords, label: 'Looking Like A Real Fighter', tag: 'Most Popular' },
  { icon: Zap, label: 'Faster & More Explosive', tag: 'Top Choice' },
  { icon: Flame, label: 'Leaner & Peak Stamina', tag: 'Recommended' },
  { icon: Brain, label: 'Unshakeable Discipline', tag: 'High Impact' },
];

const FutureSelf: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.futureSelf || 'Looking Like A Real Fighter');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ futureSelf: label });
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-4">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Imagine yourself <span className="text-primary">6 months</span> from now.
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
          If you stay consistent, what would success look like?
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-3 content-start relative">
        {FUTURES.map((f) => {
          const active = selected === f.label;
          const Icon = f.icon;
          return (
            <motion.button
              key={f.label}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(f.label)}
              className={`relative flex flex-col items-center justify-between p-3.5 rounded-3xl border text-center transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              {f.tag && (
                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full mb-1 ${
                  active ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                }`}>
                  {f.tag}
                </span>
              )}
              <Icon className={`w-6 h-6 my-1 ${active ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
              <span className={`text-[10px] font-black uppercase leading-tight ${active ? 'text-primary' : 'text-white/70'}`}>{f.label}</span>
            </motion.button>
          );
        })}
      </main>

      <AnimatePresence>
        {selected && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-[11px] font-bold text-primary/80 italic mt-4"
          >
            Every workout moves you closer to this version of yourself.
          </motion.p>
        )}
      </AnimatePresence>

      <footer className="mt-6 flex flex-col gap-4">
        <button onClick={nextStep} disabled={!selected} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-40">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default FutureSelf;
