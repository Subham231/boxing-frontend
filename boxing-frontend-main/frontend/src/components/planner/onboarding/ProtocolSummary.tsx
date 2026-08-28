'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, PartyPopper } from 'lucide-react';
import type { PlannerProfile, WeeklyPlan } from '@/types';

interface ProtocolSummaryProps {
  profile: PlannerProfile;
  plan: WeeklyPlan;
  onLaunch: () => void;
}

export default function ProtocolSummary({ profile, plan, onLaunch }: ProtocolSummaryProps) {
  const totalExercises = plan.days.reduce(
    (sum, d) => sum + d.protocol.reduce((s, b) => s + (b.exercises?.length || 0), 0),
    0
  );

  const rows: [string, string][] = [
    ['Program Length', '1 Week (auto-renews)'],
    ['Training Days', `${plan.days.length} Days Per Week`],
    ['Session Duration', `${profile.minutesPerSession || 30} Minutes`],
    ['Primary Focus', profile.goals?.length ? profile.goals.slice(0, 2).join(' + ') : 'All-Rounder'],
    ['Equipment', profile.equipment?.length ? profile.equipment.slice(0, 2).join(' + ') : 'Bodyweight Only'],
    ['Recovery Plan', profile.intensityPreference === 'Elite' || profile.intensityPreference === 'High' ? 'Aggressive' : 'Balanced'],
    ['Total Exercises', `${totalExercises}+`],
    ['Progressive Difficulty', 'Enabled'],
    ['Daily Grind Integration', 'Ready'],
  ];

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-4 gap-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-black italic uppercase text-white leading-tight">Your Tactical Protocol Is Ready</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5 rounded-3xl border-primary/20 bg-black/40 flex flex-col gap-3"
      >
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide">{label}</span>
            <span className="text-xs font-black text-white uppercase">{value}</span>
          </div>
        ))}
      </motion.div>

      <button
        onClick={onLaunch}
        className="btn-primary w-full h-16 flex items-center justify-center gap-2 shadow-[0_10px_40px_rgba(226,255,59,0.25)]"
      >
        START MY FIRST WORKOUT <Rocket className="w-4 h-4" />
      </button>
    </div>
  );
}
