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

  const winnerUid = match.player_a_uid === uid ? match.player_b_uid : match.player_a_uid;
  await supabaseAdmin
    .from('spar_matches')
    .update({
      status: 'completed',
      winner_uid: winnerUid,
      completed_at: new Date().toISOString(),
      player_a_result: match.player_a_uid === uid ? null : match.player_a_result,
      player_b_result: match.player_b_uid === uid ? null : match.player_b_result,
    })
    .eq('id', params.matchId);

  await supabaseAdmin.from('spar_queue').delete().in('uid', [match.player_a_uid, match.player_b_uid]);
  return NextResponse.json({ ok: true, winnerUid });
}
