'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowDown } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

const WEEKS = [
  { label: 'Week 1', desc: 'Basic Footwork', level: 25 },
  { label: 'Week 2', desc: 'Footwork + Angles', level: 50 },
  { label: 'Week 3', desc: '+ Defense', level: 75 },
  { label: 'Week 4', desc: 'Advanced Ring Movement', level: 100 },
];

const StructuredProgram: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">13 / 20</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Built like a real <span className="text-primary">training program</span>.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Your training evolves over time instead of repeating the same routines.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-1">
        {WEEKS.map((w, i) => (
          <motion.div
            key={w.label}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
          >
            <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-primary">{i + 1}</span>
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-wide block">{w.label}</span>
                <span className="text-sm font-black text-white uppercase">{w.desc}</span>
                <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${w.level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.12 }}
                  />
                </div>
              </div>
            </div>
            {i < WEEKS.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-3.5 h-3.5 text-white/20" />
              </div>
            )}
          </motion.div>
        ))}
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

export default StructuredProgram;
