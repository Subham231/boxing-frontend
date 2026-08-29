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

  // Build ICE servers array with multiple STUN servers for better NAT traversal
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Add TURN server if configured (for symmetric NAT traversal)
  // Set these in your environment variables:
  // TURN_SERVER_URL=turn:your-turn-server.com:3478
  // TURN_USERNAME=your-username
  // TURN_CREDENTIAL=your-password
  const turnUrl = (process.env.TURN_SERVER_URL || '').trim();
  const turnUser = (process.env.TURN_USERNAME || '').trim();
  const turnCred = (process.env.TURN_CREDENTIAL || '').trim();
  if (turnUrl && turnUser && turnCred) {
    iceServers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }

  const turnsUrl = (process.env.TURNS_SERVER_URL || '').trim();
  const turnsUser = (process.env.TURNS_USERNAME || '').trim();
  const turnsCred = (process.env.TURNS_CREDENTIAL || '').trim();
  if (turnsUrl && turnsUser && turnsCred) {
    iceServers.push({
      urls: turnsUrl,
      username: turnsUser,
      credential: turnsCred,
    });
  }

  return NextResponse.json({ ok: true, iceServers });
}
