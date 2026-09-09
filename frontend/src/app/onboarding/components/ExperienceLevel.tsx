'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Award, Shield, Swords, Flame, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const LEVELS = [
  {
    icon: Sparkles,
    label: 'Complete beginner',
    tag: 'Clean Slate',
    desc: 'Never boxed or just stepping into training.',
  },
  {
    icon: Shield,
    label: "I've trained casually",
    tag: 'Basics Down',
    desc: 'A few classes, shadowboxing, or fitness boxing.',
  },
  {
    icon: Swords,
    label: 'Intermediate',
    tag: 'Solid Base',
    desc: 'Good fundamentals, combos, and movement.',
  },
  {
    icon: Award,
    label: 'Experienced boxer',
    tag: 'Ring Ready',
    desc: 'Regular sparring, sharp mechanics & fight IQ.',
  },
  {
    icon: Flame,
    label: 'Competitive',
    tag: 'Fight Camp',
    desc: 'Amateur/pro bouts or active fight training.',
  },
];

const ExperienceLevel: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.experience_level || 'Complete beginner');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ experience_level: label });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Where are you <span className="text-primary">starting from</span>?
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          SparAI calibrates drill complexity, stance corrections, and round pacing to your true foundation.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-2.5 sm:gap-3 my-auto">
        {LEVELS.map((lvl) => {
          const active = selected === lvl.label;
          const Icon = lvl.icon;
          return (
            <motion.button
              key={lvl.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(lvl.label)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 ${
                active
                  ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.18)]'
                  : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-primary text-black' : 'bg-white/5 text-primary/70'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2.25} />
                </div>
                <div>
                  <span
                    className={`text-xs sm:text-sm font-black uppercase block leading-tight ${
                      active ? 'text-primary' : 'text-white'
                    }`}
                  >
                    {lvl.label}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium leading-tight">
                    {lvl.desc}
                  </span>
                </div>
              </div>
              {lvl.tag && (
                <span
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    active
                      ? 'bg-primary text-black'
                      : 'bg-white/5 text-white/40 border border-white/5'
                  }`}
                >
                  {lvl.tag}
                </span>
              )}
            </motion.button>
          );
        })}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button
          onClick={nextStep}
          disabled={!selected}
          className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          CONTINUE <ChevronRight size={20} />
        </button>
        <button
          onClick={prevStep}
          className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto"
        >
          Back
        </button>
      </footer>
    </div>
  );
};

export default ExperienceLevel;
