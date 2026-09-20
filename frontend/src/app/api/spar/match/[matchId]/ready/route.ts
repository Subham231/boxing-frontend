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

  // `match` is genuinely reassigned in the migration-fallback branch below,
  // so this destructuring must stay `let`. (eslint's prefer-const flagged
  // only the sibling `matchErr`, which is never reassigned — but the two
  // share one declaration, so it cannot be narrowed without splitting them.)
  // eslint-disable-next-line prefer-const
  let { data: match, error: matchErr } = await supabaseAdmin
    .from('spar_matches')
    .select('id, player_a_uid, player_b_uid, status, match_started_at')
    .eq('id', params.matchId)
    .maybeSingle();

  // Degrade gracefully if the synced-clock migration has not been applied.
  if (matchErr) {
    console.error('[spar/ready] match_started_at column missing — apply supabase/reflex-schema-v22.sql', matchErr);
    const fallback = await supabaseAdmin
      .from('spar_matches')
      .select('id, player_a_uid, player_b_uid, status')
      .eq('id', params.matchId)
      .maybeSingle();
    match = fallback.data ? { ...fallback.data, match_started_at: null } : null;
  }

  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  if (match.player_a_uid !== auth.uid && match.player_b_uid !== auth.uid) {
    return NextResponse.json({ error: 'Not a participant.' }, { status: 403 });
  }

  if (match.status === 'pending') {
    await supabaseAdmin.from('spar_matches').update({ status: 'active' }).eq('id', params.matchId);
  }

  // Set the shared command-clock origin once, then return the stored value to
  // both fighters so their command sequence stays synchronized.
  let matchStartedAt = match.match_started_at as string | null;
  if (!matchStartedAt) {
    const nowIso = new Date().toISOString();
    try {
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('spar_matches')
        .update({ match_started_at: nowIso })
        .eq('id', params.matchId)
        .is('match_started_at', null)
        .select('match_started_at')
        .maybeSingle();
      if (claimErr) throw claimErr;
      if (claimed?.match_started_at) {
        matchStartedAt = claimed.match_started_at;
      } else {
        const { data: refetched } = await supabaseAdmin
          .from('spar_matches')
          .select('match_started_at')
          .eq('id', params.matchId)
          .maybeSingle();
        matchStartedAt = refetched?.match_started_at ?? nowIso;
      }
    } catch (e) {
      console.error('[spar/ready] could not persist match_started_at — apply supabase/reflex-schema-v22.sql', e);
      matchStartedAt = nowIso;
    }
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

  return NextResponse.json({
    ok: true,
    iceServers,
    matchStartedAtMs: matchStartedAt ? new Date(matchStartedAt).getTime() : Date.now(),
  });
}
