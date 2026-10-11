import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getFighterCard } from '@/lib/server/fighterCard';

export const runtime = 'nodejs';

/** Both fighters' public cards for the pre-match intro. Participants only. */
export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } },
) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }
  const { data: match } = await supabaseAdmin
    .from('spar_matches')
    .select('player_a_uid, player_b_uid')
    .eq('id', params.matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  if (match.player_a_uid !== auth.uid && match.player_b_uid !== auth.uid) {
    return NextResponse.json({ error: 'Not a participant.' }, { status: 403 });
  }
  const opponentUid = match.player_a_uid === auth.uid ? match.player_b_uid : match.player_a_uid;
  const [you, opponent] = await Promise.all([getFighterCard(auth.uid), getFighterCard(opponentUid)]);
  // uid is only needed server-side; strip it from the opponent card.
  const { uid: _omit, ...opponentPublic } = opponent;
  void _omit;
  return NextResponse.json({ you, opponent: opponentPublic });
}
