import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } },
) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const uid = auth.uid;
  const { data: match } = await supabaseAdmin
    .from('spar_matches')
    .select('*')
    .eq('id', params.matchId)
    .maybeSingle();

  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  if (match.player_a_uid !== uid && match.player_b_uid !== uid) {
    return NextResponse.json({ error: 'Not a participant.' }, { status: 403 });
  }
  if (!['pending', 'active', 'awaiting_results'].includes(match.status)) {
    return NextResponse.json({ error: 'Match cannot be forfeited.' }, { status: 409 });
  }

  const winner = match.player_a_uid === uid ? match.player_b_uid : match.player_a_uid;
  await supabaseAdmin
    .from('spar_matches')
    .update({
      status: 'completed',
      winner_uid: winner,
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.matchId);

  await supabaseAdmin.from('spar_queue').delete().in('uid', [match.player_a_uid, match.player_b_uid]);

  if (match.is_paid_match) {
    for (const id of [match.player_a_uid, match.player_b_uid]) {
      const won = id === winner;
      const { data: profile } = await supabaseAdmin
        .from('reflex_profiles')
        .select('display_name')
        .eq('uid', id)
        .maybeSingle();
      const name = (profile?.display_name || 'FIGHTER').toUpperCase();
      const { data: existing } = await supabaseAdmin
        .from('spar_leaderboard')
        .select('wins, losses')
        .eq('uid', id)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from('spar_leaderboard').insert({
          uid: id,
          display_name: name,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
        });
      } else {
        await supabaseAdmin
          .from('spar_leaderboard')
          .update({
            display_name: name,
            wins: existing.wins + (won ? 1 : 0),
            losses: existing.losses + (won ? 0 : 1),
            updated_at: new Date().toISOString(),
          })
          .eq('uid', id);
      }
    }
  }

  return NextResponse.json({ ok: true, winnerUid: winner });
}
