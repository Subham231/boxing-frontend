import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const uid = auth.uid;

  const { data: queue } = await supabaseAdmin
    .from('spar_queue')
    .select('status')
    .eq('uid', uid)
    .maybeSingle();

  if (!queue || queue.status === 'searching') {
    return NextResponse.json({ status: 'searching' });
  }

  if (queue.status === 'cancelled') {
    return NextResponse.json({ status: 'cancelled' });
  }

  const { data: match } = await supabaseAdmin
    .from('spar_matches')
    .select('id, player_a_uid, player_b_uid, command_sequence, is_paid_match, status')
    .or(`player_a_uid.eq.${uid},player_b_uid.eq.${uid}`)
    .in('status', ['pending', 'active', 'awaiting_results'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ status: 'searching' });
  }

  const opponentUid = match.player_a_uid === uid ? match.player_b_uid : match.player_a_uid;
  return NextResponse.json({
    status: 'matched',
    matchId: match.id,
    opponentUid,
    commandSequence: match.command_sequence,
    signalingChannel: `spar-${match.id}`,
    isPaidMatch: match.is_paid_match,
    role: match.player_a_uid === uid ? 'offer' : 'answer',
  });
}
