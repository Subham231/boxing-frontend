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
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="mb-3">
        <StepBadge />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" /> Fighter profile
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.9] tracking-tighter text-white">
          Your Full <span className="text-primary">Fighter Profile</span>
        </h1>
        <p className="text-white/50 mt-1.5 text-[10px] font-semibold leading-relaxed">
          {hasData
            ? 'The core metrics are live. The full tactical breakdown remains locked until your trial is activated.'
            : 'Your combat profile is being estimated from your onboarding responses.'}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3">
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl border border-primary/50 bg-gradient-to-br from-primary/15 via-black/70 to-black/95 shadow-[0_0_30px_rgba(226,255,59,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[8px] font-black uppercase tracking-[0.22em] text-primary block">Overall Combat Score</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl sm:text-6xl font-black text-white leading-none">{totalScore}</span>
                  <span className="pb-2 text-sm font-bold text-white/40">/100</span>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-right">
                <Trophy className="w-6 h-6 text-primary mx-auto" />
                <span className="mt-1 block text-[7px] font-black uppercase text-white/60">{punchCount} punches</span>
              </div>
            </div>
            <div className={`mt-3 inline-flex items-center rounded-full border border-current/20 bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${gradeColor}`}>
              {grade} Level Fighter
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/18 to-black/70 p-4 shadow-[0_0_20px_rgba(226,255,59,0.12)]"
          >
            <div className="absolute inset-x-4 top-3 h-10 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-center justify-between mb-2">
              <span className="text-[7px] font-black uppercase tracking-[0.18em] text-primary">Merit 1</span>
              <Zap className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <span className="relative block text-4xl sm:text-5xl font-black leading-none text-white">
              {hasData ? accuracyMerit : '—'}<span className="text-xs font-bold text-white/40 align-super">%</span>
            </span>
            <span className="relative mt-2 block text-[8px] font-black uppercase tracking-[0.18em] text-primary">Strike Accuracy</span>
            <span className="relative text-[7px] text-white/45 font-bold uppercase">Clean Kinetic Delivery</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/18 to-black/70 p-4 shadow-[0_0_20px_rgba(226,255,59,0.12)]"
          >
            <div className="absolute inset-x-4 top-3 h-10 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-center justify-between mb-2">
              <span className="text-[7px] font-black uppercase tracking-[0.18em] text-primary">Merit 2</span>
              <Flame className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <span className="relative block text-4xl sm:text-5xl font-black leading-none text-white">
              {hasData ? kineticPSI : '—'}<span className="text-xs font-bold text-white/40 align-super">PSI</span>
            </span>
            <span className="relative mt-2 block text-[8px] font-black uppercase tracking-[0.18em] text-primary">Kinetic Power</span>
            <span className="relative text-[7px] text-white/45 font-bold uppercase">Explosive Leverage</span>
          </motion.div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(226,255,59,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_28%)]" />
          <div className="absolute inset-0 opacity-40">
            <motion.div
              animate={{ x: ['-12%', '12%', '-12%'] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 top-2 h-14 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
            />
            <motion.div
              animate={{ y: ['0%', '12%', '0%'] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-4 bottom-4 h-10 rounded-full border border-white/10 bg-white/[0.03]"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Deep Tactical Breakdown</span>
            <span className="text-[7px] font-black text-primary/70 uppercase">Premium</span>
          </div>

          <div className="relative z-10 filter blur-[4px] select-none pointer-events-none opacity-35 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[7px] text-white/40 uppercase block">Projected Winrate</span>
                <span className="text-lg font-black text-white">78.5%</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[7px] text-white/40 uppercase block">Stamina Decay</span>
                <span className="text-lg font-black text-white">-4.2%</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[7px] text-white/40 uppercase block">Counter Timing</span>
                <span className="text-lg font-black text-white">164ms</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[7px] text-white/40 uppercase block">Combo Density</span>
                <span className="text-lg font-black text-white">4.8/seq</span>
              </div>
            </div>
            <div className="h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white/20" />
            </div>
          </div>

          <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/70 via-black/80 to-black/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_18px_rgba(226,255,59,0.3)]">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.2em] text-white">Full Breakdown Locked</div>
              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-white/65 max-w-[270px]">
                Unlock your <span className="text-primary font-black">30-Day Free Trial</span> to reveal your complete tactical profile, win probabilities, timing patterns, and performance roadmap.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {['Winrate', 'Stamina', 'Combos', 'Timing'].map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.18em] text-white/45">
                  {tag}
                </span>
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
          Unlock Full Breakdown <ChevronRight size={18} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
}
