'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const FIGHTERS = [
  { name: 'Floyd Mayweather', traits: ['Defense', 'Precision', 'Discipline'], quote: 'Hard work and dedication — that\'s the difference.' },
  { name: 'Muhammad Ali', traits: ['Confidence', 'Movement', 'Greatness'], quote: 'I am the greatest, I said that even before I knew I was.' },
  { name: 'Mike Tyson', traits: ['Aggression', 'Power', 'Fearlessness'], quote: 'Discipline is doing what needs to be done even when you don\'t feel like doing it.' },
  { name: 'Manny Pacquiao', traits: ['Speed', 'Endurance', 'Heart'], quote: 'Explosiveness, that\'s my strength.' },
  { name: 'Canelo Alvarez', traits: ['IQ', 'Technique', 'Patience'], quote: 'I always believe in myself and my abilities.' },
  { name: 'Oleksandr Usyk', traits: ['Footwork', 'Strategy', 'Adaptability'], quote: 'You have to work hard in silence.' },
  { name: 'Someone Else', traits: ['My own path'], quote: 'Every great fighter starts by writing their own story.' },
];

const FavoriteFighter: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.favoriteFighter || null);

  const handleSelect = (name: string) => {
    setSelected(name);
    updateData({ favoriteFighter: name });
  };

  const activeFighter = FIGHTERS.find((f) => f.name === selected);

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Who inspires your <span className="text-primary">fighting style</span>?
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Every fighter has someone they look up to. Choose the athlete whose mindset, discipline, or
          fighting style motivates you the most.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3">
        {FIGHTERS.map((f) => {
          const active = selected === f.name;
          return (
            <motion.button
              key={f.name}
              type="button"
              onClick={() => handleSelect(f.name)}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-4 rounded-3xl border transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black uppercase ${active ? 'text-primary' : 'text-white'}`}>{f.name}</span>
                <div className="flex gap-1.5">
                  {f.traits.map((t) => (
                    <span key={t} className="text-[8px] font-bold text-white/30 uppercase bg-white/5 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}

        <AnimatePresence mode="wait">
          {activeFighter && (
            <motion.div
              key={activeFighter.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-4 rounded-3xl border-primary/20 bg-primary/[0.04] mt-1"
            >
              <p className="text-xs italic text-white/70 font-semibold leading-relaxed">"{activeFighter.quote}"</p>
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

export default FavoriteFighter;
