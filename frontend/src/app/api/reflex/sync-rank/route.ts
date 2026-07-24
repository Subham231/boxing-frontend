import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { applySessionProgress, type RankState } from '@/lib/rank-system';

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
  const now = new Date().toISOString();

  const { data: existing } = await supabaseAdmin.from('user_streaks').select('*').eq('uid', uid).maybeSingle();
  if (!existing) {
    return NextResponse.json({ state: null });
  }

  const next = applySessionProgress(existing as RankState, now, false);

  // Only write back if something actually changed (avoid pointless writes
  // on every page view).
  if (next.rank_level !== existing.rank_level || next.streak_progress_days !== existing.streak_progress_days || next.current_streak !== existing.current_streak) {
    await supabaseAdmin.from('user_streaks').upsert({
      uid,
      current_streak: next.current_streak,
      longest_streak: next.longest_streak,
      rank_level: next.rank_level,
      streak_progress_days: next.streak_progress_days,
      last_active_at: next.last_active_at,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ state: next });
}
