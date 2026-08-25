'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, BatteryLow, Map, TrendingDown, RefreshCw, HeartPulse } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const OBSTACLES = [
  { icon: Clock, label: 'Lack of Time', tag: 'Most Common', response: "We'll build a plan that fits your real schedule, not the other way around." },
  { icon: BatteryLow, label: 'Lack of Motivation', tag: 'Recommended Focus', response: "Consistency beats motivation — small daily wins keep you moving even on low days." },
  { icon: Map, label: 'No Clear Structure', tag: 'Best Choice', response: "That's exactly what a Tactical Protocol solves — structure instead of guesswork." },
  { icon: TrendingDown, label: 'Inconsistent Results', tag: 'High Impact', response: 'Progress you can track is progress you can trust.' },
];

const Obstacle: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.biggestObstacle || 'Lack of Time');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ biggestObstacle: label });
  };

  const active = OBSTACLES.find((o) => o.label === selected);

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What's held you back <span className="text-primary">before</span>?
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Be honest with yourself. Understanding the obstacle is the first step to beating it.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3">
        {OBSTACLES.map((o) => {
          const isActive = selected === o.label;
          const Icon = o.icon;
          return (
            <motion.button
              key={o.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(o.label)}
              className={`relative flex items-center justify-between p-4 rounded-3xl border text-left transition-all duration-300 ${
                isActive ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
                <span className={`text-xs sm:text-sm font-black uppercase ${isActive ? 'text-primary' : 'text-white'}`}>{o.label}</span>
              </div>
              {o.tag && (
                <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {o.tag}
                </span>
              )}
            </motion.button>
          );
        })}

        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-4 rounded-3xl border-primary/20 bg-primary/[0.04] mt-1"
            >
              <p className="text-xs italic text-white/70 font-semibold leading-relaxed">{active.response}</p>
            </motion.div>
          )}
        </AnimatePresence>
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

export default Obstacle;
