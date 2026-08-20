import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

/** Activate a pending match when both clients are ready (optional handshake). */
export async function POST(
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
    .select('id, player_a_uid, player_b_uid, status')
    .eq('id', params.matchId)
    .maybeSingle();

  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  if (match.player_a_uid !== auth.uid && match.player_b_uid !== auth.uid) {
    return NextResponse.json({ error: 'Not a participant.' }, { status: 403 });
  }

  if (match.status === 'pending') {
    await supabaseAdmin.from('spar_matches').update({ status: 'active' }).eq('id', params.matchId);
  }

  const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];
  if (process.env.TURN_SERVER_URL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }

  return NextResponse.json({ ok: true, iceServers });
}
