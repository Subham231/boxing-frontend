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

// Consecutive credited sessions needed to climb from `level` to `level + 1`.
// Grows by 2 every rank: 3, 5, 7, 9, 11, 13.
export function requiredStreakForNextRank(level: number): number {
  return 3 + level * 2;
}

// Every 2 full missed 24h windows (48h of inactivity since the last credited
// session) costs exactly one rank (can cascade for longer absences) — this is
// intentionally much more forgiving than a "miss one day, streak resets to
// zero" system, while still actually breaking the streak.
export const INACTIVE_HOURS_PER_DEMOTION = 48;
export const CREDIT_WINDOW_HOURS = 24;

export function getRankTier(level: number): RankTier {
  return RANKS[Math.max(0, Math.min(level, MAX_RANK_LEVEL))];
}

export interface RankState {
  uid: string;
  current_streak: number;
  longest_streak: number;
  rank_level: number;
  streak_progress_days: number;
  // ISO timestamp (timestamptz) of the last credited session — NOT a
  // calendar date. Using a rolling timestamp instead of a UTC calendar date
  // is what makes this correct for users far from UTC (e.g. India, UTC+5:30):
  // a calendar-date comparison could call two sessions "consecutive" even
  // when they were ~47 hours apart (11:59pm one day, 12:01am two days later
  // in local time), or call them "missed" when they were <24h apart, purely
  // depending on what time of day the user trains relative to UTC midnight.
  last_active_at: string | null;
}

function hoursBetween(fromIso: string | null, toIso: string): number {
  if (!fromIso) return Infinity;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return (to - from) / 3600000;
}

// The single authoritative state-transition function — used by both server
// routes (complete-session and sync-rank) so the exact same logic computes
// demotions and promotions, with no drift between "what counts as a rank
// change" in different places.
//
// - didCompleteSession=true is only ever passed when a real video-analysis
//   session just finished (never on login, never on a plain page view).
// - Completing more than once within the same rolling 24h window is free:
//   no extra credit, but also no penalty — the user can use the analysis
//   feature as often as they like without it affecting their streak either
//   way.
export function applySessionProgress(state: RankState, nowIso: string, didCompleteSession: boolean): RankState {
  const next = { ...state };
  const gapHours = hoursBetween(next.last_active_at, nowIso);

  // Apply any pending demotions for inactivity BEFORE crediting this
  // session, so a comeback session always starts from the correctly
  // demoted rank rather than a stale one.
  if (gapHours >= INACTIVE_HOURS_PER_DEMOTION) {
    const demotions = Math.floor(gapHours / INACTIVE_HOURS_PER_DEMOTION);
    next.rank_level = Math.max(0, next.rank_level - demotions);
    next.streak_progress_days = 0;
    next.current_streak = 0;
  }

  if (!didCompleteSession) return next;

  // Already credited within the last 24h — free re-use of the feature,
  // no additional streak credit.
  if (next.last_active_at !== null && gapHours < CREDIT_WINDOW_HOURS) return next;

  // Consecutive if this session lands within the window that follows the
  // previous credited session (i.e. before a demotion-worthy gap would have
  // occurred). Otherwise the streak restarts at 1.
  next.current_streak = gapHours < INACTIVE_HOURS_PER_DEMOTION && next.current_streak > 0
    ? next.current_streak + 1
    : 1;
  next.longest_streak = Math.max(next.longest_streak, next.current_streak);
  next.streak_progress_days += 1;

  const required = requiredStreakForNextRank(next.rank_level);
  if (next.rank_level < MAX_RANK_LEVEL && next.streak_progress_days >= required) {
    next.rank_level += 1;
    next.streak_progress_days = 0;
  }

  next.last_active_at = nowIso;
  return next;
}
