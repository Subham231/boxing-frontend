export interface RankTier {
  level: number;
  name: string;
  color: string; // tailwind-safe hex, used for badges/progress bars
}

export const RANKS: RankTier[] = [
  { level: 0, name: 'ROOKIE', color: '#888888' },
  { level: 1, name: 'BRONZE', color: '#CD7F32' },
  { level: 2, name: 'SILVER', color: '#C0C0C0' },
  { level: 3, name: 'GOLD', color: '#FFD700' },
  { level: 4, name: 'PLATINUM', color: '#E5E4E2' },
  { level: 5, name: 'DIAMOND', color: '#B9F2FF' },
  { level: 6, name: 'MASTER', color: '#E2FF3B' },
];

export const MAX_RANK_LEVEL = RANKS.length - 1;

// Consecutive ACTIVE days needed to climb from `level` to `level + 1`.
// Grows by 2 every rank: 3, 5, 7, 9, 11, 13.
export function requiredStreakForNextRank(level: number): number {
  return 3 + level * 2;
}

// Every 2 full consecutive INACTIVE days costs exactly one rank (can
// cascade for longer absences) — this is intentionally much more forgiving
// than the old "miss one day, streak resets to zero" behavior.
export const INACTIVE_DAYS_PER_DEMOTION = 2;

export function getRankTier(level: number): RankTier {
  return RANKS[Math.max(0, Math.min(level, MAX_RANK_LEVEL))];
}

export interface RankState {
  uid: string;
  current_streak: number;
  longest_streak: number;
  rank_level: number;
  streak_progress_days: number;
  last_active_date: string | null;
}

function daysBetween(fromIso: string | null, toIso: string): number {
  if (!fromIso) return Infinity;
  const from = new Date(fromIso + 'T00:00:00Z').getTime();
  const to = new Date(toIso + 'T00:00:00Z').getTime();
  return Math.round((to - from) / 86400000);
}

// The single authoritative state-transition function — used by the server
// route so the exact same logic that computes demotions also computes
// promotions, with no drift between client display and server truth.
export function applyDailyProgress(state: RankState, todayIso: string, didCompleteToday: boolean): RankState {
  const next = { ...state };
  const gap = daysBetween(next.last_active_date, todayIso);

  // Apply any pending demotions for inactivity BEFORE crediting today's
  // activity, so a comeback day always starts from the correctly-demoted
  // rank rather than an stale one.
  if (gap >= INACTIVE_DAYS_PER_DEMOTION) {
    const demotions = Math.floor(gap / INACTIVE_DAYS_PER_DEMOTION);
    next.rank_level = Math.max(0, next.rank_level - demotions);
    next.streak_progress_days = 0;
    next.current_streak = 0;
  }

  if (!didCompleteToday) return next;
  if (next.last_active_date === todayIso) return next; // already credited today

  next.current_streak = gap === 1 ? next.current_streak + 1 : 1;
  next.longest_streak = Math.max(next.longest_streak, next.current_streak);
  next.streak_progress_days += 1;

  const required = requiredStreakForNextRank(next.rank_level);
  if (next.rank_level < MAX_RANK_LEVEL && next.streak_progress_days >= required) {
    next.rank_level += 1;
    next.streak_progress_days = 0;
  }

  next.last_active_date = todayIso;
  return next;
}
