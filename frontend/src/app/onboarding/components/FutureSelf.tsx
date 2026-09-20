'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Swords, Zap, Flame, Brain, Heart } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const FUTURES = [
  { icon: Zap, label: 'Faster & more explosive', tag: 'High Velocity', desc: 'Explosive snap & speed' },
  { icon: Swords, label: 'Look & move like a fighter', tag: 'Fighter Physique', desc: 'Conditioned & agile' },
  { icon: Heart, label: 'Unbreakable stamina', tag: 'Iron Lungs', desc: 'Endless energy in later rounds' },
  { icon: Brain, label: 'Sharper fight IQ', tag: 'Ring General', desc: 'Anticipate & counter cleanly' },
  { icon: Flame, label: 'Unshakeable discipline', tag: 'Mindset', desc: 'Show up no matter what' },
];

const FutureSelf: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.futureSelf || 'Look & move like a fighter');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ futureSelf: label });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Picture yourself <span className="text-primary">90 days</span> from now.
        </h1>
        <p className="text-white/70 mt-2.5 sm:mt-3 text-xs sm:text-sm font-semibold">
          What would make you proud?
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-2.5 sm:gap-3 content-start relative my-auto">
        {FUTURES.map((f) => {
          const active = selected === f.label;
          const Icon = f.icon;
          return (
            <motion.button
              key={f.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(f.label)}
              className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? 'bg-primary text-black' : 'bg-white/5 text-primary/70'}`}>
                  <Icon className="w-4 h-4" strokeWidth={2.25} />
                </div>
                <div>
                  <span className={`text-xs sm:text-sm font-black uppercase block leading-tight ${active ? 'text-primary' : 'text-white'}`}>{f.label}</span>
                  <span className="text-[9px] text-white/40 font-medium">{f.desc}</span>
                </div>
              </div>
              {f.tag && (
                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  active ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                }`}>
                  {f.tag}
                </span>
              )}
            </motion.button>
          );
        })}
      </main>

      <AnimatePresence>
        {selected && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs sm:text-sm font-black text-primary italic mt-3 tracking-wide"
          >
            &ldquo;Hold that version of yourself in your mind.&rdquo;
          </motion.p>
        )}
      </AnimatePresence>

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

export default FutureSelf;
