'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Map, Flame, BarChart3, LineChart, History, Trophy, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const MODULES = [
  { icon: Map, label: 'Tactical Planner' },
  { icon: Flame, label: 'Daily Grind' },
  { icon: BarChart3, label: 'Progress Dashboard' },
  { icon: LineChart, label: 'Analytics' },
  { icon: History, label: 'Workout History' },
  { icon: Trophy, label: 'Achievements' },
  { icon: Sparkles, label: 'Future Updates' },
];

const Ecosystem: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Everything you need, <span className="text-primary">in one place</span>.
        </h1>
      </header>

      <main className="flex-1 flex flex-col gap-2 sm:gap-2.5 my-auto">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-3 sm:p-3.5 rounded-3xl border-white/5 bg-black/40 flex items-center gap-3"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-white uppercase tracking-wide">{m.label}</span>
            </motion.div>
          );
        })}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button onClick={nextStep} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default Ecosystem;
