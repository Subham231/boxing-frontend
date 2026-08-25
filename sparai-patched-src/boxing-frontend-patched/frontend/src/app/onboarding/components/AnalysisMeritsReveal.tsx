'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Lock, Sparkles, Zap, Flame, TrendingUp, Trophy } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import type { MiniAnalysisResult } from './FreestyleAnalysis';

function GradeLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'ELITE', color: 'text-primary' };
  if (score >= 65) return { label: 'ADVANCED', color: 'text-cyan-400' };
  if (score >= 45) return { label: 'DEVELOPING', color: 'text-yellow-400' };
  return { label: 'BASELINE', color: 'text-white/70' };
}

export default function AnalysisMeritsReveal(): JSX.Element {
  const { nextStep, prevStep } = useOnboarding();
  const [result, setResult] = useState<MiniAnalysisResult | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sparai_mini_analysis');
      if (raw) setResult(JSON.parse(raw));
    } catch { /* non-fatal */ }
  }, []);

  // Derived display values
  const totalScore   = result?.totalScore   ?? 0;
  const powerScore   = result?.powerScore   ?? 0;
  const rotScore     = result?.rotationScore ?? 0;
  const stanceScore  = result?.stanceScore  ?? 0;
  const punchCount   = result?.punchCount   ?? 0;
  const peakV        = result?.peakVelocity ?? 0;
  const hasData      = punchCount >= 3;

  const { label: grade, color: gradeColor } = GradeLabel(totalScore);

  // Compute the 2 "newly unlocked" merits from real data
  // Merit 1: Strike Accuracy Index (derived from stance tracking quality)
  const accuracyMerit = Math.min(99, Math.max(60, Math.round(stanceScore * 0.92 + 8)));
  // Merit 2: Kinetic Power Index (derived from peak velocity)
  const kineticPSI    = Math.min(620, Math.max(180, Math.round((peakV / 900) * 620)));

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="mb-3">
        <StepBadge />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" /> MERITS UNLOCKED
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.93] tracking-tighter text-white">
          Your Full <span className="text-primary">Fighter Profile</span>
        </h1>
        <p className="text-white/50 mt-1.5 text-[10px] font-semibold leading-relaxed">
          {hasData
            ? 'The 2 combat merits locked after your 30-second session are now calibrated with your complete profile data.'
            : 'Your combat merits are being estimated from your onboarding responses.'}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3">

        {/* Total score banner */}
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent flex items-center gap-4 shadow-[0_0_25px_rgba(226,255,59,0.12)]"
          >
            <div>
              <span className="text-[8px] font-black uppercase tracking-wider text-primary block">OVERALL COMBAT SCORE</span>
              <div className="flex items-end gap-1.5 mt-0.5">
                <span className="text-4xl font-black text-white leading-none">{totalScore}</span>
                <span className="text-sm font-bold text-white/40 mb-0.5">/100</span>
              </div>
              <span className={`text-[8px] font-black uppercase tracking-wide ${gradeColor}`}>{grade} LEVEL FIGHTER</span>
            </div>
            <div className="ml-auto flex flex-col items-center gap-1">
              <Trophy className="w-7 h-7 text-primary" />
              <span className="text-[7px] font-black text-white/40 uppercase">{punchCount} punches</span>
            </div>
          </motion.div>
        )}

        {/* 2 Newly Unlocked Merits */}
        <div className="grid grid-cols-2 gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 rounded-3xl border border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(226,255,59,0.15)] flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[7px] font-black uppercase tracking-wider text-primary">MERIT 1 — UNLOCKED</span>
              <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-white leading-none">
              {hasData ? accuracyMerit : '—'}<span className="text-xs font-bold text-white/40">%</span>
            </span>
            <span className="text-[8px] font-black uppercase text-primary tracking-wide mt-1">Strike Accuracy</span>
            <span className="text-[7px] text-white/50 font-bold uppercase mt-0.5">Clean Kinetic Delivery</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="p-4 rounded-3xl border border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(226,255,59,0.15)] flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[7px] font-black uppercase tracking-wider text-primary">MERIT 2 — UNLOCKED</span>
              <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-white leading-none">
              {hasData ? kineticPSI : '—'}<span className="text-xs font-bold text-white/40"> PSI</span>
            </span>
            <span className="text-[8px] font-black uppercase text-primary tracking-wide mt-1">Kinetic Power</span>
            <span className="text-[7px] text-white/50 font-bold uppercase mt-0.5">Explosive Leverage</span>
          </motion.div>
        </div>

        {/* Teased deep breakdown — blurred / locked */}
        <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-white/40">DEEP COMBAT ANALYTICS</span>
            <span className="text-[7px] font-black text-primary/70 uppercase">PRO SUITE</span>
          </div>

          {/* Blurred content */}
          <div className="filter blur-[4px] select-none pointer-events-none opacity-30 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">PROJECTED WINRATE</span>
                <span className="text-base font-black text-white">78.5%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">STAMINA DECAY</span>
                <span className="text-base font-black text-white">-4.2%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">COUNTER TIMING</span>
                <span className="text-base font-black text-white">164 ms</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">COMBO DENSITY</span>
                <span className="text-base font-black text-white">4.8 hits/seq</span>
              </div>
            </div>
            <div className="h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white/20" />
            </div>
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/85 to-black/95 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(226,255,59,0.3)]">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-black uppercase tracking-wide text-white leading-tight">
              FULL BREAKDOWN LOCKED
            </span>
            <p className="text-[10px] font-semibold text-white/60 max-w-[260px] leading-snug">
              Start your <span className="text-primary font-black">30-Day Free Trial</span> on the next step to unlock your complete combat analytics, AI sparring arena, and personalised tactical protocols.
            </p>
            <div className="flex items-center gap-2 mt-1">
              {['WINRATE','STAMINA','COMBOS','TIMING'].map(t => (
                <span key={t} className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-4 flex flex-col gap-2.5">
        <button
          onClick={nextStep}
          className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_30px_rgba(226,255,59,0.4)]"
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
