import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

function getPeriodStartIST(period: 'weekly' | 'monthly' | 'all_time'): string | null {
  if (period === 'all_time') return null;

  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);

  if (period === 'weekly') {
    // Current ISO day: 1 = Mon, ..., 7 = Sun
    const day = istDate.getUTCDay() || 7;
    istDate.setUTCDate(istDate.getUTCDate() - day + 1); // Reset to Monday
    istDate.setUTCHours(0, 0, 0, 0);
  } else {
    // Reset to 1st of current month
    istDate.setUTCDate(1);
    istDate.setUTCHours(0, 0, 0, 0);
  }

  // Convert back to UTC ISO string
  return new Date(istDate.getTime() - istOffset).toISOString();
}

export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || 'weekly') as 'weekly' | 'monthly' | 'all_time';
  const periodStart = getPeriodStartIST(period);

  let query = supabaseAdmin
    .from('spar_matches')
    .select('id, player_a_uid, player_b_uid, winner_uid, player_a_result, player_b_result, completed_at, status')
    .eq('status', 'completed');

  if (periodStart) {
    query = query.gte('completed_at', periodStart);
  }

  const { data: matches, error } = await query;

  if (error || !matches) {
    // Fallback to legacy spar_leaderboard table if matches query errors
    const { data: fallback } = await supabaseAdmin
      .from('spar_leaderboard')
      .select('uid, display_name, wins, losses, updated_at')
      .order('wins', { ascending: false })
      .limit(50);

    const rows = (fallback || []).map((r: any) => {
      const total = (r.wins || 0) + (r.losses || 0);
      const winRate = total > 0 ? Math.round(((r.wins || 0) / total) * 100) : 0;
      return {
        uid: r.uid,
        display_name: r.display_name,
        wins: r.wins || 0,
        losses: r.losses || 0,
        matches_played: total,
        win_rate: winRate,
        avg_score: 85,
      };
    });

    return NextResponse.json({ rows, period, periodStart });
  }

  // Aggregate user stats from completed matches
  type UserStats = {
    uid: string;
    wins: number;
    losses: number;
    matches_played: number;
    scoreSum: number;
    scoreCount: number;
  };

  const map = new Map<string, UserStats>();

  for (const m of matches) {
    const uids = [m.player_a_uid, m.player_b_uid].filter(Boolean);
    for (const uid of uids) {
      if (!map.has(uid)) {
        map.set(uid, {
          uid,
          wins: 0,
          losses: 0,
          matches_played: 0,
          scoreSum: 0,
          scoreCount: 0,
        });
      }
      const st = map.get(uid)!;
      st.matches_played += 1;
      if (m.winner_uid === uid) {
        st.wins += 1;
      } else if (m.winner_uid) {
        st.losses += 1;
      }

      const res = uid === m.player_a_uid ? m.player_a_result : m.player_b_result;
      if (res && typeof res.score === 'number') {
        st.scoreSum += res.score;
        st.scoreCount += 1;
      }
    }
  }

  const uids = Array.from(map.keys());
  const { data: profiles } = uids.length
    ? await supabaseAdmin
        .from('reflex_profiles')
        .select('uid, display_name, avatar_url')
        .in('uid', uids)
    : { data: [] as any[] };

  const nameMap = new Map<string, { name: string; avatar_url: string | null }>(
    (profiles || []).map((p: any) => [
      p.uid,
      { name: (p.display_name || 'FIGHTER').toUpperCase(), avatar_url: p.avatar_url || null },
    ]),
  );

  const rows = Array.from(map.values())
    .map((st) => {
      const p = nameMap.get(st.uid);
      const winRate = st.matches_played > 0 ? Math.round((st.wins / st.matches_played) * 100) : 0;
      const avgScore = st.scoreCount > 0 ? Math.round((st.scoreSum / st.scoreCount) * 10) / 10 : 0;
      return {
        uid: st.uid,
        display_name: p?.name || 'FIGHTER',
        avatar_url: p?.avatar_url || null,
        wins: st.wins,
        losses: st.losses,
        matches_played: st.matches_played,
        win_rate: winRate,
        avg_score: avgScore,
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      return b.avg_score - a.avg_score;
    })
    .slice(0, 50);

  return NextResponse.json({ rows, period, periodStart, totalMatches: matches.length });
}

