'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Lock, Sparkles, Zap, Trophy, ShieldCheck, Flame, TrendingUp } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

export default function AnalysisMeritsReveal(): JSX.Element {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-3">
        <StepBadge />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-primary" /> UNLOCKED MERITS READY
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Your Complete <span className="text-primary">Fighter Profile</span>
        </h1>
        <p className="text-white/50 mt-2 text-xs leading-relaxed font-semibold">
          Your 2 previously locked merits from the 30s Freestyle Analysis have now been calibrated with your profile data.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3 py-1">
        {/* The 2 Newly Unlocked Merits */}
        <div className="grid grid-cols-2 gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-3xl border border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(226,255,59,0.15)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-wider text-primary">MERIT 1 UNLOCKED</span>
              <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-white block">91.4%</span>
              <span className="text-[9px] font-black uppercase text-primary tracking-wide block">Strike Accuracy</span>
            </div>
            <span className="text-[8px] text-white/50 font-bold uppercase">Clean Kinetic Delivery</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-3xl border border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(226,255,59,0.15)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-wider text-primary">MERIT 2 UNLOCKED</span>
              <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-white block">482 <span className="text-xs font-bold text-white/40">PSI</span></span>
              <span className="text-[9px] font-black uppercase text-primary tracking-wide block">Punch Power Index</span>
            </div>
            <span className="text-[8px] text-white/50 font-bold uppercase">Explosive Leverage</span>
          </motion.div>
        </div>

        {/* Other Advanced Merits (Power, Winrate Projection, Recovery Speed) with Blur */}
        <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 overflow-hidden flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-white/40">DEEP COMBAT METRICS</span>
            <span className="text-[8px] font-black uppercase text-primary/70">PRO SUITE</span>
          </div>

          <div className="grid grid-cols-2 gap-2 filter blur-[3.5px] select-none pointer-events-none opacity-40">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase block">PROJECTED WINRATE</span>
              <span className="text-lg font-black text-white">78.5%</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase block">STAMINA DECAY</span>
              <span className="text-lg font-black text-white">-4.2% / rnd</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase block">COUNTER TIMING</span>
              <span className="text-lg font-black text-white">164 ms</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase block">PUNCH COMBOS</span>
              <span className="text-lg font-black text-white">4.8 hits / seq</span>
            </div>
          </div>

          {/* Locked Teaser Overlay */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-1.5 shadow-[0_0_12px_rgba(226,255,59,0.3)]">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wide text-white">
              DETAILED BREAKDOWN LOCKED
            </span>
            <p className="text-[10px] font-semibold text-white/60 mt-1 max-w-[270px] leading-tight">
              Start your 30-Day Free Trial on the next step to unlock your full combat analytics, AI sparring arena, and tactical protocols.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-5 flex flex-col gap-3">
        <button
          onClick={nextStep}
          className="btn-primary w-full h-15 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.35)]"
        >
          CLAIM 30-DAY FREE ACCESS <ChevronRight size={18} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
}
