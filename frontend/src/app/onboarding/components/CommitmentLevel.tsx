'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Flame, Sparkles, Zap, ShieldAlert } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

interface LevelTier {
  name: string;
  badge: string;
  color: string;
  glow: string;
  border: string;
  bg: string;
  icon: typeof Flame;
  quote: string;
}

function getTier(val: number): LevelTier {
  if (val < 25) {
    return {
      name: 'Just Exploring',
      badge: 'EXPLORATION',
      color: 'text-white/60',
      glow: 'rgba(255,255,255,0.1)',
      border: 'border-white/10',
      bg: 'bg-white/[0.02]',
      icon: Sparkles,
      quote: 'Curious to see what boxing conditioning feels like.',
    };
  }
  if (val < 55) {
    return {
      name: 'Somewhat Interested',
      badge: 'BUILDING MOMENTUM',
      color: 'text-yellow-300',
      glow: 'rgba(253,224,71,0.25)',
      border: 'border-yellow-400/40',
      bg: 'bg-yellow-400/[0.04]',
      icon: Zap,
      quote: 'Ready to build genuine discipline and sharpen technique.',
    };
  }
  if (val < 85) {
    return {
      name: 'Committed',
      badge: 'FIGHTER MINDSET',
      color: 'text-primary',
      glow: 'rgba(226,255,59,0.35)',
      border: 'border-primary/60',
      bg: 'bg-primary/[0.06]',
      icon: Flame,
      quote: 'Discipline beats motivation. Showing up no matter what.',
    };
  }
  return {
    name: 'ALL IN',
    badge: 'CHAMPIONSHIP OBSESSION',
    color: 'text-red-400',
    glow: 'rgba(248,113,113,0.5)',
    border: 'border-red-500',
    bg: 'bg-red-500/[0.12]',
    icon: ShieldAlert,
    quote: 'Zero excuses. Relentless execution. You are here to become dangerous.',
  };
}

const CommitmentLevel: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [value, setValue] = useState<number>(data.commitmentLevel ?? 75);

  const handleChange = (v: number) => {
    setValue(v);
    updateData({ commitmentLevel: v });
  };

  const tier = getTier(value);
  const TierIcon = tier.icon;
  const isAllIn = value >= 85;

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-3 sm:mb-5">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          How serious are you <br />
          about <span className="text-primary">changing</span>?
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm font-semibold">
          Drag the slider to define your standard of commitment.
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 sm:gap-7 my-auto">
        {/* Dynamic Card with progressive intensity */}
        <motion.div
          animate={{
            scale: isAllIn ? [1, 1.02, 1] : 1,
            boxShadow: `0 0 35px ${tier.glow}`,
          }}
          transition={isAllIn ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
          className={`w-full p-5 sm:p-6 rounded-3xl border ${tier.border} ${tier.bg} backdrop-blur-xl flex flex-col items-center text-center transition-all duration-300 relative overflow-hidden`}
        >
          {isAllIn && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-red-500/10 via-transparent to-primary/10 animate-pulse" />
          )}

          <div className="flex items-center gap-2 mb-2">
            <TierIcon className={`w-4 h-4 ${tier.color}`} />
            <span
              className={`text-[9px] font-black uppercase tracking-[3px] px-2.5 py-0.5 rounded-full border ${tier.border} ${tier.color}`}
            >
              {tier.badge}
            </span>
          </div>

          <div className="my-1">
            <span
              className={`text-6xl sm:text-7xl font-black italic tracking-tighter block leading-none ${
                isAllIn ? 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.8)]' : tier.color
              }`}
            >
              {value}%
            </span>
            <span
              className={`text-sm sm:text-base font-black uppercase tracking-wider block mt-1.5 ${
                isAllIn ? 'text-white' : 'text-white/90'
              }`}
            >
              {tier.name}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={tier.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs sm:text-sm font-semibold italic text-white/70 mt-2 max-w-xs"
            >
              &ldquo;{tier.quote}&rdquo;
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Intensity Slider */}
        <div className="w-full px-2">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-white/10 accent-primary"
            style={{
              background: `linear-gradient(to right, #ffffff30 0%, #fde047 40%, #E2FF3B 70%, #f87171 100%)`,
            }}
          />
          <div className="grid grid-cols-4 text-center text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-white/40 mt-3 gap-1">
            <span className={value < 25 ? 'text-white font-black' : ''}>Just Exploring</span>
            <span className={value >= 25 && value < 55 ? 'text-yellow-300 font-black' : ''}>Somewhat Interested</span>
            <span className={value >= 55 && value < 85 ? 'text-primary font-black' : ''}>Committed</span>
            <span className={value >= 85 ? 'text-red-400 font-black' : ''}>ALL IN</span>
          </div>
        </div>
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button
          onClick={nextStep}
          className={`w-full h-14 sm:h-16 flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-[0.16em] text-sm shadow-[0_10px_40px_rgba(226,255,59,0.3)] transition-all ${
            isAllIn
              ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'btn-primary'
          }`}
        >
          CONTINUE <ChevronRight size={20} />
        </button>
        <button
          onClick={prevStep}
          className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto"
        >
          Back
        </button>
      </footer>
    </div>
  );
};

export default CommitmentLevel;
