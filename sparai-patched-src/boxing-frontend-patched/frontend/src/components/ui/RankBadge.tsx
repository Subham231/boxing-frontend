import React from 'react';
import { twMerge } from 'tailwind-merge';
import { RANKS, getRankLevelForStreak } from '@/lib/rank-system';

interface RankBadgeProps {
  // Legacy fallback only — a locally-guessed "score" (e.g. workout streak
  // count) used to pick a rank name/color when the real rank_level isn't
  // available yet (e.g. still loading, or logged out).
  score: number;
  // The authoritative rank level (0-6) from the Supabase user_streaks
  // table, via syncRankState()/useRankState(). When provided, this is
  // always preferred over the score-guessing fallback below.
  level?: number | null;
  className?: string;
}



export function getRankInfoByLevel(level: number) {
  const clamped = Math.max(0, Math.min(level, RANKS.length - 1));
  const tier = RANKS[clamped];
  return {
    name: tier.name,
    color: tier.color,
    badgeImg: tier.badgeImg,
    iconImg: tier.iconImg,
    textClass: clamped === RANKS.length - 1 ? 'text-primary' : 'text-white',
  };
}

// Deprecated fallback — guesses a rank from an arbitrary "score"
export function getRankInfo(score: number) {
  const level = getRankLevelForStreak(score);
  return getRankInfoByLevel(level);
}

export function RankBadge({ score, level, className }: RankBadgeProps) {
  const rank = level !== undefined && level !== null ? getRankInfoByLevel(level) : getRankInfo(score);

  return (
    <div
      className={twMerge(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black tracking-widest bg-gradient-to-r from-black/80 via-black/50 to-black/80 shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 hover:brightness-125 select-none",
        rank.name === 'MASTER' ? 'border-purple-500/60 shadow-[0_0_15px_rgba(208,64,255,0.4)]' :
        rank.name === 'DIAMOND' ? 'border-cyan-500/60 shadow-[0_0_15px_rgba(0,153,255,0.4)]' :
        rank.name === 'PLATINUM' ? 'border-teal-400/60 shadow-[0_0_15px_rgba(0,229,255,0.3)]' :
        rank.name === 'GOLD' ? 'border-yellow-500/60 shadow-[0_0_15px_rgba(255,215,0,0.35)]' :
        rank.name === 'SILVER' ? 'border-zinc-300/50 shadow-[0_0_12px_rgba(192,192,192,0.25)]' :
        rank.name === 'BRONZE' ? 'border-amber-700/60 shadow-[0_0_12px_rgba(205,127,50,0.3)]' :
        'border-white/10 text-white/70',
        className
      )}
    >
      <div className="w-5 h-5 flex items-center justify-center shrink-0 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
        <img src={rank.iconImg} alt={rank.name} className="w-full h-full object-contain" />
      </div>
      <span className={rank.textClass} style={{ color: rank.color }}>{rank.name}</span>
    </div>
  );
}
