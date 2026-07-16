'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const FUTURES = [
  { emoji: '🏆', label: 'Winning Competitions' },
  { emoji: '🥊', label: 'Looking Like A Fighter' },
  { emoji: '⚡', label: 'Faster And More Athletic' },
  { emoji: '🔥', label: 'Leaner And Healthier' },
  { emoji: '💪', label: 'Stronger Physically' },
  { emoji: '🧠', label: 'More Disciplined' },
  { emoji: '😎', label: 'More Confident' },
  { emoji: '❤️', label: 'Better Mental Health' },
];

const FutureSelf: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.futureSelf || null);

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ futureSelf: label });
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">06 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Imagine yourself <span className="text-primary">6 months</span> from now.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          If you stay consistent, what would success look like?
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-3 content-start relative">
        {FUTURES.map((f) => {
          const active = selected === f.label;
          return (
            <motion.button
              key={f.label}
              type="button"
              whileTap={{ scale: 0.96 }}
              animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              onClick={() => handleSelect(f.label)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-3xl border text-center transition-all duration-300 overflow-hidden ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              {active && (
                <motion.div
                  className="absolute inset-0 bg-primary/10"
                  initial={{ opacity: 0.6, scale: 0 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.8 }}
                />
              )}
              <span className="text-2xl relative z-10">{f.emoji}</span>
              <span className={`text-[10px] font-black uppercase leading-tight relative z-10 ${active ? 'text-primary' : 'text-white/70'}`}>{f.label}</span>
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
