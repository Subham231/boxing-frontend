'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Flame, Check } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { SampleTag, AnimatedRing } from './OnboardingCharts';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DONE = [true, true, true, true, false, false, false];

const DailyConsistency: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Consistency beats <span className="text-primary">motivation</span>.
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Small daily wins lead to long-term improvement.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3 sm:gap-4 my-auto">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-wide">Daily Grind Preview</span>
          <SampleTag />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-4 sm:p-5 rounded-3xl border-primary/20 bg-primary/[0.04] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs font-black text-white uppercase block">Today&apos;s Workout</span>
              <span className="text-[9px] text-white/40 font-semibold">Tactical Protocol — Day 4</span>
            </div>
          </div>
          <AnimatedRing percent={60} size={52} stroke={5} label="" />
        </motion.div>

        <div className="glass-card p-4 sm:p-5 rounded-3xl border-white/5 bg-black/40">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-wide block mb-3">Weekly Streak</span>
          <div className="flex justify-between">
            {DAYS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[8px] font-bold text-white/30 uppercase">{d}</span>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                    DONE[i] ? 'bg-primary text-black' : 'bg-white/5 text-white/20 border border-white/10'
                  }`}
                >
                  {DONE[i] && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
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

export default DailyConsistency;
