import React from 'react';
import { Flame, Gem, Award, Medal, Shield, User } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

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

const RANK_ICON_LIST = [User, Shield, Shield, Medal, Award, Gem, Flame];
const RANK_NAMES = ['ROOKIE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'];
const RANK_COLORS = ['#888888', '#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF', '#E2FF3B'];

export function getRankInfoByLevel(level: number) {
  const clamped = Math.max(0, Math.min(level, RANK_NAMES.length - 1));
  return {
    name: RANK_NAMES[clamped],
    color: RANK_COLORS[clamped],
    icon: RANK_ICON_LIST[clamped],
    textClass: clamped === RANK_NAMES.length - 1 ? 'text-primary' : 'text-white',
  };
}

// Deprecated fallback — guesses a rank from an arbitrary "score" (e.g. a
// locally-tracked workout streak) rather than the authoritative rank_level.
// Only used when a real level isn't available.
export function getRankInfo(score: number) {
  if (score >= 31) return { name: 'MASTER', color: '#E2FF3B', icon: Flame, textClass: 'text-primary' };
  if (score >= 22) return { name: 'DIAMOND', color: '#B9F2FF', icon: Gem, textClass: 'text-cyan-200' };
  if (score >= 15) return { name: 'PLATINUM', color: '#E5E4E2', icon: Award, textClass: 'text-slate-200' };
  if (score >= 8) return { name: 'GOLD', color: '#FFD700', icon: Medal, textClass: 'text-yellow-400' };
  if (score >= 4) return { name: 'SILVER', color: '#C0C0C0', icon: Shield, textClass: 'text-gray-300' };
  if (score >= 1) return { name: 'BRONZE', color: '#CD7F32', icon: Shield, textClass: 'text-amber-700' };
  return { name: 'ROOKIE', color: '#888888', icon: User, textClass: 'text-gray-500' };
}

export function RankBadge({ score, level, className }: RankBadgeProps) {
  const rank = level !== undefined && level !== null ? getRankInfoByLevel(level) : getRankInfo(score);
  const IconComponent = rank.icon;

  return (
    <div
      className={twMerge(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-bold tracking-widest bg-white/5",
        rank.name === 'MASTER' ? 'border-primary/30 text-primary' : 'border-white/10 text-white',
        className
      )}
    >
      <IconComponent className="w-3.5 h-3.5" style={{ color: rank.color }} />
      <span className={rank.textClass}>{rank.name}</span>
    </div>
  );
}
