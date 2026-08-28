'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, X, Check } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const RANDOM = ['Random Training', 'Repeated Workouts', 'No Progress Tracking'];
const STRUCTURED = ['Structured Plans', 'Progress Analytics', 'Continuous Improvement'];

const TrainingProblem: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Most fighters don't fail <br /> because they lack <span className="text-primary">talent</span>.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Many athletes struggle because they train without structure, repeat the same routines, or
          never measure their progress. This app helps organize your training, monitor your
          improvement, and keep your workouts purposeful.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 justify-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-5 border-red-500/20 bg-red-500/[0.04] rounded-3xl flex flex-col gap-3"
        >
          {RANDOM.map((item, i) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-red-400" />
              </div>
              <span className="text-xs font-bold text-white/60 uppercase tracking-wide">{item}</span>
            </div>
          ))}
        </motion.div>

        <div className="flex items-center justify-center">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">VS</span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-5 border-primary/30 bg-primary/[0.05] rounded-3xl flex flex-col gap-3"
        >
          {STRUCTURED.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-black text-white uppercase tracking-wide">{item}</span>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="mt-8 flex flex-col gap-4">
        <button onClick={nextStep} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default TrainingProblem;
