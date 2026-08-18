import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { applySessionProgress, type RankState } from '@/lib/rank-system';
import { getEntitlement } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) {
    return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }
  const uid = decoded.uid;

  const { data: profile } = await supabaseAdmin
    .from('reflex_profiles')
    .select('subscription_until')
    .eq('uid', uid)
    .maybeSingle();

  if (!isSubscriptionActive(profile?.subscription_until)) {
    return NextResponse.json(
      { error: 'Your subscription has ended. Upgrade to keep using the AI Analyser.' },
      { status: 402 }
    );
  }

  const now = new Date().toISOString();

  const { data: existing } = await supabaseAdmin.from('user_streaks').select('*').eq('uid', uid).maybeSingle();

  const current: RankState = existing || {
    uid,
    current_streak: 0,
    longest_streak: 0,
    rank_level: 0,
    streak_progress_days: 0,
    last_active_at: null,
  };

  const next = applySessionProgress(current, now, true);

  const { error } = await supabaseAdmin.from('user_streaks').upsert({
    uid,
    current_streak: next.current_streak,
    longest_streak: next.longest_streak,
    rank_level: next.rank_level,
    streak_progress_days: next.streak_progress_days,
    last_active_at: next.last_active_at,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rankedUp = next.rank_level > current.rank_level;
  const alreadyCreditedToday = next.last_active_at === current.last_active_at && current.last_active_at !== null;
  return NextResponse.json({ state: next, rankedUp, alreadyCreditedToday });
}
