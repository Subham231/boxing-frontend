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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black tracking-widest bg-black/40 shadow-md backdrop-blur-md",
        rank.name === 'MASTER' ? 'border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(208,64,255,0.3)]' : 'border-white/10 text-white',
        className
      )}
    >
      <img src={rank.iconImg} alt={rank.name} className="w-5 h-5 object-contain shrink-0" />
      <span className={rank.textClass} style={{ color: rank.color }}>{rank.name}</span>
    </div>
  );
}
