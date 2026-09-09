'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Target, Zap, Battery, Footprints, Flame, RefreshCw, Shield, HelpCircle } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const WEAKNESSES = [
  { icon: Target, label: 'My technique', tag: 'High Priority', response: "Clean mechanics create effortless power and defense. We'll refine your fundamentals round by round." },
  { icon: Zap, label: 'My speed', tag: 'Reflex Drills', response: "Hand speed and twitch reactions are trained, not born. High-cadence drills will unlock your snap." },
  { icon: Battery, label: 'My conditioning', tag: 'Engine Focus', response: "Fatigue makes cowards of us all. We will build an engine that outlasts any opponent." },
  { icon: Footprints, label: 'My footwork', tag: 'Ring General', response: "Boxing is fought with the feet first. Master angles, pivots, and distance control." },
  { icon: Flame, label: 'My power', tag: 'Kinetic Chain', response: "True knockout leverage starts in the ground and hips. We will sharpen your kinetic chain." },
  { icon: RefreshCw, label: 'My consistency', tag: 'Most Common', response: "Discipline beats motivation. Daily manageable bites build habits that never crumble." },
  { icon: Shield, label: 'My confidence', tag: 'Mental Armor', response: "Confidence comes from repetition. As your form becomes second nature, so will your confidence." },
  { icon: HelpCircle, label: "I'm not sure yet", tag: 'Full Audit', response: "That's why SparAI exists. Your AI vision analysis will uncover your strengths and blind spots automatically." },
];

const Obstacle: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>(data.biggestObstacle || 'My technique');

  const handleSelect = (label: string) => {
    setSelected(label);
    updateData({ biggestObstacle: label });
  };

  const active = WEAKNESSES.find((w) => w.label === selected);

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-3 sm:mb-5">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What&apos;s holding your <span className="text-primary">boxing back</span>?
        </h1>
        <p className="text-white/60 mt-2 text-xs sm:text-sm font-semibold">
          Diagnose your primary friction point so SparAI can target it directly in your protocol.
        </p>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-2 sm:gap-2.5 content-start my-auto">
        {WEAKNESSES.map((w) => {
          const isActive = selected === w.label;
          const Icon = w.icon;
          return (
            <motion.button
              key={w.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(w.label)}
              className={`relative flex flex-col items-start justify-between p-3 rounded-2xl border text-left transition-all duration-300 ${
                isActive ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-primary/40'}`} strokeWidth={2.25} />
                {w.tag && (
                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/5'
                  }`}>
                    {w.tag}
                  </span>
                )}
              </div>
              <span className={`text-xs font-black uppercase leading-tight ${isActive ? 'text-primary' : 'text-white'}`}>{w.label}</span>
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
              className="glass-card p-3 rounded-2xl border-primary/20 bg-primary/[0.04] mt-2 text-center"
            >
              <p className="text-[11px] italic text-primary/80 font-semibold leading-snug">{active.response}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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

export default Obstacle;
