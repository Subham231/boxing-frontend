import { supabase } from './supabase';
import { firebaseAuth } from './firebase';
import type { UserProfile } from './firebase-auth';

export interface ReflexScoreRow {
  uid: string;
  game_id: 'reaction_tap' | 'combo_flash';
  best_score: number | null;
  weekly_score: number | null;
  week_id: string;
  games_played: number;
  avg_reaction_time: number | null;
  last_played: string;
  reflex_profiles?: { phone: string } | null;
}

// ISO 8601 week id, e.g. "2026-W29". Once the week rolls over, old
// weekly_score rows simply stop matching this id, so the leaderboard
// "resets" with no cron job required — lifetime stats (best_score,
// games_played, avg_reaction_time) are untouched.
export function getCurrentWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Reads the current top-N immediately, then refreshes on a simple interval.
// This deliberately avoids Supabase Realtime/Replication entirely — no
// extra project settings need to be touched, and a 10s poll is more than
// fast enough for a leaderboard.
export function subscribeWeeklyLeaderboard(
  gameId: 'reaction_tap' | 'combo_flash',
  topN: number,
  callback: (rows: ReflexScoreRow[]) => void
) {
  const client = supabase;
  if (!client) return () => {};
  const weekId = getCurrentWeekId();

  const fetchRows = async () => {
    const { data } = await client
      .from('reflex_scores')
      .select('*, reflex_profiles(phone)')
      .eq('game_id', gameId)
      .eq('week_id', weekId)
      .order('weekly_score', { ascending: true })
      .limit(topN);
    callback((data as ReflexScoreRow[]) || []);
  };

  fetchRows();
  const interval = setInterval(fetchRows, 10000);

  return () => {
    clearInterval(interval);
  };
}

export async function getUserWeeklyRank(gameId: 'reaction_tap' | 'combo_flash', uid: string): Promise<number | null> {
  if (!supabase) return null;
  const weekId = getCurrentWeekId();

  const { data: mine } = await supabase
    .from('reflex_scores')
    .select('weekly_score, week_id')
    .eq('uid', uid)
    .eq('game_id', gameId)
    .maybeSingle();

  if (!mine || mine.weekly_score == null || mine.week_id !== weekId) return null;

  const { count } = await supabase
    .from('reflex_scores')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('week_id', weekId)
    .lt('weekly_score', mine.weekly_score);

  return (count || 0) + 1;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('reflex_profiles').select('*').eq('uid', uid).maybeSingle();
  return data as UserProfile | null;
}

// The ONLY way a score gets written. Sends raw round times + the Firebase
// ID token to /api/reflex/submit-score, which re-verifies the token and
// re-validates every round server-side before touching Supabase — see
// that route for the actual security logic. This client function does not
// write anything itself.
export async function submitReflexScoreSecure(
  gameId: 'reaction_tap',
  roundTimesSeconds: number[]
): Promise<{ accepted: boolean; reason?: string }> {
  const user = firebaseAuth.currentUser;
  if (!user) return { accepted: false, reason: 'Not logged in.' };

  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ gameId, roundTimes: roundTimesSeconds }),
  });
  return res.json();
}
