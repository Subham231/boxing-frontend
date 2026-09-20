'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Brain, Swords, Zap, Target } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const MINDSETS = [
  { icon: Brain, label: 'Tactical Thinker', tag: 'Most Picked', quote: 'I outsmart opponents with timing.' },
  { icon: Swords, label: 'Aggressive Finisher', tag: 'High Power', quote: 'I push the pace and land heavy.' },
  { icon: Zap, label: 'Speed Specialist', tag: 'Recommended', quote: 'I rely on movement, slips & angles.' },
  { icon: Target, label: 'Precision Counter', tag: 'Elite Choice', quote: 'I make them miss and pay.' },
];

const BoxingMindset: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.boxingMindset || 'Tactical Thinker');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ boxingMindset: label });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What&apos;s your <span className="text-primary">fighting style</span>?
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Select the combat mindset that best describes who you want to become in the ring.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-2.5 my-auto">
        {MINDSETS.map((m) => {
          const active = selected === m.label;
          const Icon = m.icon;
          return (
            <motion.button
              key={m.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(m.label)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-3xl border text-left transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
                <div>
                  <span className={`text-xs sm:text-sm font-black uppercase block ${active ? 'text-primary' : 'text-white'}`}>{m.label}</span>
                  <span className="text-[9px] text-white/40 font-semibold italic leading-tight">&quot;{m.quote}&quot;</span>
                </div>
              </div>
              {m.tag && (
                <span className={`text-[7px] sm:text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                  active ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                }`}>
                  {m.tag}
                </span>
              )}
            </motion.button>
          );
        })}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button onClick={nextStep} disabled={!selected} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-40">
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
