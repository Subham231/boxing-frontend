'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const DRIVERS = [
  { emoji: '💪', label: 'Get Stronger' },
  { emoji: '🥊', label: 'Become a Better Boxer' },
  { emoji: '❤️', label: 'Improve My Health' },
  { emoji: '⚡', label: 'Build Discipline' },
  { emoji: '😎', label: 'Gain Confidence' },
  { emoji: '🏆', label: 'Prepare For Competition' },
  { emoji: '🛡', label: 'Learn Self Defense' },
  { emoji: '🔥', label: 'Transform My Lifestyle' },
];

const MAX_SELECT = 3;

const Motivation: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.motivations || []);

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
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">05 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Why are you starting <span className="text-primary">this journey</span>?
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          There is no wrong answer. Choose up to 3 things that motivate you most.
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-3 content-start">
        {DRIVERS.map((d) => {
          const active = selected.includes(d.label);
          return (
            <motion.button
              key={d.label}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(d.label)}
              className={`flex flex-col items-center gap-2 p-4 rounded-3xl border text-center transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <span className="text-2xl">{d.emoji}</span>
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
            className="text-center text-[11px] font-bold text-primary/80 italic mt-4"
          >
            We'll keep these goals in mind throughout your journey.
          </motion.p>
        )}
      </AnimatePresence>

      <footer className="mt-6 flex flex-col gap-4">
        <button onClick={nextStep} disabled={!selected.length} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-40">
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
