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
          <GlassCard className="p-6 border-white/5 bg-black/40 flex flex-col items-center gap-3 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 flex items-center justify-center relative"
            >
              <img
                src={currentTier.iconImg}
                alt={currentTier.name}
                className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              />
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
                  <span>{state?.current_streak || 0} / {required} Days</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: RANKS[rankLevel + 1].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round(((state?.current_streak || 0) / required) * 100))}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Max Rank Reached 👑</p>
            )}
          </GlassCard>

          {/* How it works */}
          <GlassCard className="p-5 border-white/5 bg-black/40 flex flex-col gap-3">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">How Ranking Works</span>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                Complete an AI video analysis session every day to build your streak. Reach 3, 5, 7, 9, 11, and 13-day streaks to unlock higher combat badges.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                Miss 2 full days in a row (48h inactivity) and you drop one rank. Train daily to keep your badge glowing.
              </p>
            </div>
          </GlassCard>

          {/* Rank ladder matching exact user image */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Rank Ladder</span>
            {RANKS.slice(1).reverse().map((tier) => {
              const isCurrent = tier.level === rankLevel;
              const isPast = tier.level < rankLevel;
              return (
                <div
                  key={tier.level}
                  className={`relative flex items-center justify-between p-4 rounded-2xl border overflow-hidden transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-white/10 to-black/60 border-primary shadow-[0_0_20px_rgba(226,255,59,0.15)] scale-[1.02]'
                      : isPast
                        ? 'bg-black/40 border-white/10 opacity-90'
                        : 'bg-black/20 border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-4 z-10">
                    <div className="w-14 h-14 flex items-center justify-center shrink-0 p-1 bg-black/40 rounded-2xl border border-white/10 shadow-inner">
                      <img src={tier.iconImg} alt={tier.name} className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                    </div>
                    <div>
                      <span className="text-base font-black italic uppercase tracking-wider block leading-none" style={{ color: tier.color }}>
                        {tier.name}
                      </span>
                      <span className="text-[10px] font-extrabold text-white/50 uppercase tracking-wide block mt-1">
                        Requires {tier.requiredStreak}-Day Streak
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="px-3 py-1 text-[9px] font-black rounded-full uppercase bg-primary text-black tracking-widest shadow-[0_0_10px_rgba(226,255,59,0.4)] z-10">
                      Active
                    </span>
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
