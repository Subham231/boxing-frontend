export interface RankTier {
  level: number;
  name: string;
  color: string; // tailwind-safe hex, used for badges/progress bars
  badgeImg: string;
  iconImg: string;
  requiredStreak: number;
}

export const RANKS: RankTier[] = [
  { level: 0, name: 'ROOKIE', color: '#888888', badgeImg: '/ranks/bronze.png', iconImg: '/ranks/rookie_icon.png', requiredStreak: 0 },
  { level: 1, name: 'BRONZE', color: '#CD7F32', badgeImg: '/ranks/bronze.png', iconImg: '/ranks/bronze_icon.png', requiredStreak: 3 },
  { level: 2, name: 'SILVER', color: '#C0C0C0', badgeImg: '/ranks/silver.png', iconImg: '/ranks/silver_icon.png', requiredStreak: 5 },
  { level: 3, name: 'GOLD', color: '#FFD700', badgeImg: '/ranks/gold.png', iconImg: '/ranks/gold_icon.png', requiredStreak: 7 },
  { level: 4, name: 'PLATINUM', color: '#00E5FF', badgeImg: '/ranks/platinum.png', iconImg: '/ranks/platinum_icon.png', requiredStreak: 9 },
  { level: 5, name: 'DIAMOND', color: '#0099FF', badgeImg: '/ranks/diamond.png', iconImg: '/ranks/diamond_icon.png', requiredStreak: 11 },
  { level: 6, name: 'MASTER', color: '#D040FF', badgeImg: '/ranks/master.png', iconImg: '/ranks/master_icon.png', requiredStreak: 13 },
];

export const MAX_RANK_LEVEL = RANKS.length - 1;

// Streak thresholds matching exact user design image:
// BRONZE: 3-Day, SILVER: 5-Day, GOLD: 7-Day, PLATINUM: 9-Day, DIAMOND: 11-Day, MASTER: 13-Day
export function requiredStreakForNextRank(level: number): number {
  if (level >= MAX_RANK_LEVEL) return 13;
  return RANKS[level + 1].requiredStreak;
}

// Computes rank level from streak value
export function getRankLevelForStreak(streak: number): number {
  if (streak >= 13) return 6; // MASTER
  if (streak >= 11) return 5; // DIAMOND
  if (streak >= 9) return 4;  // PLATINUM
  if (streak >= 7) return 3;  // GOLD
  if (streak >= 5) return 2;  // SILVER
  if (streak >= 3) return 1;  // BRONZE
  return 0; // ROOKIE
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

  // Recalculate rank level based on exact streak thresholds (3, 5, 7, 9, 11, 13)
  next.rank_level = getRankLevelForStreak(next.current_streak);

  next.last_active_at = nowIso;
  return next;
}
