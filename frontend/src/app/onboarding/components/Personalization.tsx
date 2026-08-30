'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Award, CalendarClock, Dumbbell, Flame, LineChart } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const CARDS = [
  { icon: Target, label: 'Your Goals' },
  { icon: Award, label: 'Your Experience' },
  { icon: CalendarClock, label: 'Your Schedule' },
  { icon: Dumbbell, label: 'Your Equipment' },
  { icon: Flame, label: 'Your Intensity' },
  { icon: LineChart, label: 'Your Progress' },
];

const Personalization: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Designed <span className="text-primary">around you</span>.
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          When you create a Tactical Protocol later, your training plan will be personalized based on
          the information you provide.
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 content-start my-auto">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-3.5 sm:p-4 rounded-3xl border-white/5 bg-black/40 flex flex-col items-center gap-1.5 sm:gap-2 text-center"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-white uppercase tracking-wide">{c.label}</span>
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

export default Personalization;
