'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const MINDSETS = [
  { emoji: '🧠', label: 'Tactical Thinker', quote: 'I outsmart opponents.' },
  { emoji: '💥', label: 'Aggressive Finisher', quote: 'I push the pace.' },
  { emoji: '⚡', label: 'Speed Specialist', quote: 'I rely on movement and speed.' },
  { emoji: '🛡', label: 'Defensive Master', quote: 'I make opponents miss.' },
  { emoji: '🔥', label: 'Relentless Worker', quote: 'I never stop moving.' },
  { emoji: '🎯', label: 'Precision Fighter', quote: 'I focus on perfect technique.' },
];

const BoxingMindset: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.boxingMindset || null);

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ boxingMindset: label });
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">08 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Which mindset describes <span className="text-primary">you best</span>?
        </h1>
      </header>

      <main className="flex-1 flex flex-col gap-3">
        {MINDSETS.map((m) => {
          const active = selected === m.label;
          return (
            <motion.button
              key={m.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(m.label)}
              className={`flex items-center gap-4 p-4 rounded-3xl border text-left transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <span className="text-2xl shrink-0">{m.emoji}</span>
              <div>
                <span className={`text-sm font-black uppercase block ${active ? 'text-primary' : 'text-white'}`}>{m.label}</span>
                <span className="text-[10px] text-white/40 font-semibold italic">"{m.quote}"</span>
              </div>
            </motion.button>
          );
        })}
      </main>

      <footer className="mt-8 flex flex-col gap-4">
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

export default BoxingMindset;
