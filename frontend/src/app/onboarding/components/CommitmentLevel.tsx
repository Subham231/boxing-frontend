'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

function getMessage(v: number): string {
  if (v < 25) return 'Every journey starts somewhere.';
  if (v < 55) return 'Consistency creates results.';
  if (v < 90) return 'Champions are built through daily effort.';
  return "Let's build something extraordinary.";
}

function getLabel(v: number): string {
  if (v < 25) return 'Just Exploring';
  if (v < 55) return 'Somewhat Interested';
  if (v < 90) return 'Committed';
  return 'All In';
}

const CommitmentLevel: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [value, setValue] = useState<number>(data.commitmentLevel ?? 60);

  const handleChange = (v: number) => {
    setValue(v);
    updateData({ commitmentLevel: v });
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">07 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          How serious are you <br /> about <span className="text-primary">improving</span>?
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <motion.div
          key={getLabel(value)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <span className="text-6xl font-black text-primary leading-none block">{value}</span>
          <span className="text-xs font-black text-white uppercase tracking-wide mt-2 block">{getLabel(value)}</span>
        </motion.div>

        <div className="w-full px-2">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full accent-[#E2FF3B] h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[8px] font-bold text-white/30 uppercase mt-2">
            <span>Just Exploring</span>
            <span>Somewhat Interested</span>
            <span>Committed</span>
            <span>All In</span>
          </div>
        </div>

        <motion.p
          key={getMessage(value)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-bold italic text-white/60 text-center"
        >
          "{getMessage(value)}"
        </motion.p>
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

export default CommitmentLevel;
