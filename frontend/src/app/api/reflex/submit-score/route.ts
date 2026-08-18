import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getCurrentWeekId, isLowerBetter } from '@/lib/week-id';
import { getEntitlement } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

const MIN_PLAUSIBLE_REACTION_SECONDS = 0.12;
const MAX_PLAUSIBLE_REACTION_SECONDS = 3.0;
const MAX_ROUNDS_PER_SUBMISSION = 5;
const MIN_PLAUSIBLE_COMBO_SCORE = 0;
const MAX_PLAUSIBLE_COMBO_SCORE = 10000;


export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ accepted: false, reason: 'Server not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) {
    return NextResponse.json({ accepted: false, reason: 'Missing auth token.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ accepted: false, reason: 'Invalid or expired token.' }, { status: 401 });
  }
  const uid = decoded.uid;

  const { data: profile } = await supabaseAdmin
    .from('reflex_profiles')
    .select('subscription_until')
    .eq('uid', uid)
    .maybeSingle();

  if (!isSubscriptionActive(profile?.subscription_until)) {
    return NextResponse.json(
      { accepted: false, reason: 'Your subscription has ended. Upgrade to keep competing on the leaderboard.' },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const gameId = body.gameId;

  if (gameId !== 'reaction_tap' && gameId !== 'combo_flash') {
    return NextResponse.json({ accepted: false, reason: 'Unsupported game id.' }, { status: 400 });
  }

  let avg: number;

  if (gameId === 'reaction_tap') {
    const roundTimes = body.roundTimes;
    if (!Array.isArray(roundTimes) || roundTimes.length === 0 || roundTimes.length > MAX_ROUNDS_PER_SUBMISSION) {
      return NextResponse.json({ accepted: false, reason: 'Invalid round data.' }, { status: 400 });
    }
    // Re-validate every round independently of whatever the client claims.
    for (const t of roundTimes) {
      if (typeof t !== 'number' || !Number.isFinite(t)) {
        return NextResponse.json({ accepted: false, reason: 'Malformed round time.' }, { status: 400 });
      }
      if (t < MIN_PLAUSIBLE_REACTION_SECONDS || t > MAX_PLAUSIBLE_REACTION_SECONDS) {
        return NextResponse.json({ accepted: false, reason: 'Round time outside plausible human range.' });
      }
    }
    avg = roundTimes.reduce((a: number, b: number) => a + b, 0) / roundTimes.length;
  } else {
    // Combo Flash: a single already-computed average points-per-level
    // score (higher = better) — there's no "round times" concept here,
    // it's not a reaction-time game.
    const comboScore = body.comboScore;
    if (typeof comboScore !== 'number' || !Number.isFinite(comboScore)) {
      return NextResponse.json({ accepted: false, reason: 'Malformed combo score.' }, { status: 400 });
    }
    if (comboScore < MIN_PLAUSIBLE_COMBO_SCORE || comboScore > MAX_PLAUSIBLE_COMBO_SCORE) {
      return NextResponse.json({ accepted: false, reason: 'Combo score outside plausible range.' });
    }
    avg = comboScore;
  }

  const weekId = getCurrentWeekId();
  const lowerBetter = isLowerBetter(gameId);

  const { data: existing } = await supabaseAdmin
    .from('reflex_scores')
    .select('*')
    .eq('uid', uid)
    .eq('game_id', gameId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin.from('reflex_scores').insert({
      uid,
      game_id: gameId,
      best_score: avg,
      weekly_score: avg,
      week_id: weekId,
      games_played: 1,
      avg_reaction_time: avg,
      last_played: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ accepted: false, reason: error.message }, { status: 500 });
    return NextResponse.json({ accepted: true });
  }

  const newGamesPlayed = existing.games_played + 1;
  const prevAvg = existing.avg_reaction_time ?? avg;
  const newLifetimeAvg = (prevAvg * existing.games_played + avg) / newGamesPlayed;
  const newBest = existing.best_score == null
    ? avg
    : lowerBetter
      ? Math.min(existing.best_score, avg)
      : Math.max(existing.best_score, avg);
  const sameWeek = existing.week_id === weekId;
  const newWeekly = !sameWeek
    ? avg
    : existing.weekly_score == null
      ? avg
      : lowerBetter
        ? Math.min(existing.weekly_score, avg)
        : Math.max(existing.weekly_score, avg);

  const { error } = await supabaseAdmin
    .from('reflex_scores')
    .update({
      best_score: newBest,
      weekly_score: newWeekly,
      week_id: weekId,
      games_played: newGamesPlayed,
      avg_reaction_time: newLifetimeAvg,
      last_played: new Date().toISOString(),
    })
    .eq('uid', uid)
    .eq('game_id', gameId);

  if (error) return NextResponse.json({ accepted: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ accepted: true });
}
