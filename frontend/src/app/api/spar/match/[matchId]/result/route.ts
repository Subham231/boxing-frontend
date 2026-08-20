import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { getEntitlement } from '@/lib/server/entitlements';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { shouldGateResultReveal } from '@/lib/server/spar';

export const runtime = 'nodejs';

export async function GET(
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

  if (match.status !== 'completed') {
    return NextResponse.json({
      status: match.status,
      waiting: true,
      message: 'Waiting for opponent results…',
    });
  }

  const entitlement = await getEntitlement(uid);
  const gate = shouldGateResultReveal(entitlement.active);

  if (gate) {
    return NextResponse.json({
      status: 'completed',
      gated: true,
      message: 'Subscribe to see who won.',
      isPaidMatch: match.is_paid_match,
    });
  }

  return NextResponse.json({
    status: 'completed',
    gated: false,
    winnerUid: match.winner_uid,
    youWon: match.winner_uid === uid,
    yourResult: match.player_a_uid === uid ? match.player_a_result : match.player_b_result,
    opponentResult: match.player_a_uid === uid ? match.player_b_result : match.player_a_result,
    isPaidMatch: match.is_paid_match,
  });
}
