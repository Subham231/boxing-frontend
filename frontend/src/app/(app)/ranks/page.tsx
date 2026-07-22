'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, Gem, Award, Medal, Shield, User, TrendingDown, TrendingUp } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { syncRankState } from '@/lib/rank-client';
import { RANKS, requiredStreakForNextRank, MAX_RANK_LEVEL, type RankState } from '@/lib/rank-system';
import { GlassCard } from '@/components/ui/GlassCard';

const RANK_ICONS = [User, Shield, Shield, Medal, Award, Gem, Flame];

export default function RanksPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useFirebaseUser();
  const [state, setState] = useState<RankState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    syncRankState().then((s) => {
      setState(s);
      setLoading(false);
    });
  }, [user, userLoading]);

  const rankLevel = state?.rank_level ?? 0;
  const currentTier = RANKS[rankLevel];
  const progress = state?.streak_progress_days ?? 0;
  const required = requiredStreakForNextRank(rankLevel);
  const progressPct = Math.min(100, Math.round((progress / required) * 100));
  const isMaxRank = rankLevel >= MAX_RANK_LEVEL;

  return (
    <div className="flex flex-col gap-6 anim-fade-in pb-16">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">Progression</div>
          <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Fighter Rank</h1>
        </div>
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </header>

      {!user && !userLoading ? (
        <GlassCard className="p-6 border-white/5 bg-black/40 text-center">
          <p className="text-xs font-bold text-white/50">Log in with your phone number to track your rank.</p>
        </GlassCard>
      ) : loading ? (
        <GlassCard className="p-6 border-white/5 bg-black/40 text-center">
          <p className="text-xs font-bold text-white/30 uppercase">Loading rank...</p>
        </GlassCard>
      ) : (
        <>
          {/* Current rank hero */}
          <GlassCard className="p-6 border-white/5 bg-black/40 flex flex-col items-center gap-3 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: currentTier.color, boxShadow: `0 0 30px ${currentTier.color}33` }}
            >
              {(() => {
                const Icon = RANK_ICONS[rankLevel];
                return <Icon className="w-9 h-9" style={{ color: currentTier.color }} />;
              })()}
            </motion.div>
            <div>
              <span className="text-2xl font-black italic uppercase tracking-wide" style={{ color: currentTier.color }}>
                {currentTier.name}
              </span>
              <p className="text-[10px] text-white/40 font-bold uppercase mt-1">
                {state?.current_streak || 0} Day Streak &bull; Longest: {state?.longest_streak || 0}
              </p>
            </div>

            {!isMaxRank ? (
              <div className="w-full flex flex-col gap-2 mt-2">
                <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                  <span>Progress to {RANKS[rankLevel + 1].name}</span>
                  <span>{progress} / {required} Days</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: RANKS[rankLevel + 1].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Max Rank Reached</p>
            )}
          </GlassCard>

          {/* How it works */}
          <GlassCard className="p-5 border-white/5 bg-black/40 flex flex-col gap-3">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">How Ranking Works</span>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                Complete a workout every day to build your streak. Each rank requires a longer streak than the last —
                the climb gets harder as you go.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                Miss 2 full days in a row and you drop one rank. A single missed day won't hurt you — but don't let
                it stretch to two.
              </p>
            </div>
          </GlassCard>

          {/* Rank ladder */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Rank Ladder</span>
            {RANKS.slice().reverse().map((tier) => {
              const Icon = RANK_ICONS[tier.level];
              const isCurrent = tier.level === rankLevel;
              const isPast = tier.level < rankLevel;
              return (
                <div
                  key={tier.level}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                    isCurrent ? 'bg-white/[0.04] border-white/20' : 'bg-black/30 border-white/5'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center border shrink-0"
                    style={{ borderColor: tier.color, opacity: isPast || isCurrent ? 1 : 0.35 }}
                  >
                    <Icon className="w-4 h-4" style={{ color: tier.color }} />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-black uppercase" style={{ color: isPast || isCurrent ? tier.color : '#666' }}>
                      {tier.name}
                    </span>
                    <p className="text-[9px] text-white/30 font-bold uppercase">
                      {tier.level === 0 ? 'Starting Rank' : `Requires ${requiredStreakForNextRank(tier.level - 1)}-Day Streak`}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[8px] font-black text-white bg-white/10 px-2 py-1 rounded-full uppercase">You</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
