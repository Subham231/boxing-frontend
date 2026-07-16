'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const SUPERPOWERS = [
  { emoji: '🗿', label: 'Iron Chin', desc: 'Nothing knocks me down.' },
  { emoji: '⚡', label: 'Lightning Hands', desc: "I'm faster than I look." },
  { emoji: '🕺', label: 'Footwork Wizard', desc: 'I control the distance.' },
  { emoji: '❤️‍🔥', label: 'Relentless Heart', desc: 'I outwork everyone.' },
  { emoji: '🧊', label: 'Ice-Cold Focus', desc: 'Pressure doesn\'t rattle me.' },
  { emoji: '💥', label: 'Explosive Power', desc: 'One shot changes everything.' },
];

const Superpower: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.trainingSuperpower || null);

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ trainingSuperpower: label });
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">09 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What's your training <span className="text-primary">superpower</span>?
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Every fighter has a trait that sets them apart. What's yours — or the one you're building?
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-3 content-start">
        {SUPERPOWERS.map((s) => {
          const active = selected === s.label;
          return (
            <motion.button
              key={s.label}
              type="button"
              whileTap={{ scale: 0.95 }}
              animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => handleSelect(s.label)}
              className={`flex flex-col items-center gap-2 p-4 rounded-3xl border text-center transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className={`text-[10px] font-black uppercase leading-tight ${active ? 'text-primary' : 'text-white/70'}`}>{s.label}</span>
              <span className="text-[8px] text-white/30 font-semibold italic leading-tight">"{s.desc}"</span>
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

export default Superpower;
