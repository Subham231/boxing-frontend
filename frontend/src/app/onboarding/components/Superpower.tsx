'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Zap, Footprints, Flame, Snowflake, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const SUPERPOWERS = [
  { icon: Zap, label: 'Lightning Hands', tag: 'Top Picked', desc: "I'm faster than I look." },
  { icon: Sparkles, label: 'Explosive Power', tag: 'KO Power', desc: 'One clean shot changes everything.' },
  { icon: Footprints, label: 'Footwork Wizard', tag: 'Recommended', desc: 'I control distance & angles.' },
  { icon: Flame, label: 'Relentless Engine', tag: 'Best Stamina', desc: 'I outwork & break pace.' },
];

const Superpower: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.trainingSuperpower || 'Lightning Hands');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ trainingSuperpower: label });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What's your training <span className="text-primary">superpower</span>?
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Every fighter has a trait that sets them apart. What's yours?
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 content-start my-auto">
        {SUPERPOWERS.map((s) => {
          const active = selected === s.label;
          const Icon = s.icon;
          return (
            <motion.button
              key={s.label}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(s.label)}
              className={`relative flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-3xl border text-center transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              {s.tag && (
                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full mb-1 ${
                  active ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                }`}>
                  {s.tag}
                </span>
              )}
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 my-1 ${active ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
              <span className={`text-[10px] font-black uppercase leading-tight ${active ? 'text-primary' : 'text-white/70'}`}>{s.label}</span>
              <span className="text-[8px] text-white/35 font-semibold italic leading-tight mt-0.5">"{s.desc}"</span>
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

export default Superpower;
