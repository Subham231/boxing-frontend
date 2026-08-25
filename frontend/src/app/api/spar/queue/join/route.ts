import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { getEntitlement } from '@/lib/server/entitlements';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateSparCommandSequence } from '@/lib/server/spar';
import { getClientIP, rateLimitMiddleware, FREE_SPARRING_LIMITER } from '@/lib/server/ip-rate-limit';

export const runtime = 'nodejs';

async function purgeOldIncompleteMatches() {
  if (!supabaseAdmin) return;
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('spar_matches')
    .delete()
    .in('status', ['pending', 'active', 'abandoned'])
    .lt('created_at', cutoff);
}

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const uid = auth.uid;

  await purgeOldIncompleteMatches();

  // Clear stale queue rows older than 3 minutes
  const staleBefore = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await supabaseAdmin.from('spar_queue').delete().eq('status', 'searching').lt('joined_at', staleBefore);

  // Check entitlement AFTER purge so we have fresh state
  const entitlement = await getEntitlement(uid);
  const isPaid = entitlement.active;

  // Apply IP-based rate limiting for free tier users (supplementary layer)
  if (!isPaid) {
    const rateLimitResponse = rateLimitMiddleware(req, FREE_SPARRING_LIMITER);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  if (isPaid) {
    const limit = entitlement.sparDailyLimit;
    const used = entitlement.sparDailyUsed;
    if (limit >= 0 && used >= limit) {
      return NextResponse.json(
        { error: 'Daily spar limit reached.', reason: 'spar_limit_reached', used, limit },
        { status: 403 },
      );
    }
  }

  const { data: consumed, error: consumeErr } = await supabaseAdmin.rpc('try_consume_spar_credit', {
    p_uid: uid,
    p_is_paid: isPaid,
  });

  if (consumeErr) {
    console.error('[spar/queue/join] consume', consumeErr);
    return NextResponse.json(
      { error: 'Could not consume spar credit. Run reflex-schema-v14.sql in Supabase.' },
      { status: 500 },
    );
  }

  if (!consumed) {
    if (!isPaid) {
      return NextResponse.json(
        {
          error: 'Daily free spar limit reached. Come back tomorrow.',
          reason: 'daily_limit_reached',
          needsAd: false,
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: 'Spar credit denied.', reason: 'denied' }, { status: 403 });
  }

  await supabaseAdmin.from('spar_queue').upsert({
    uid,
    joined_at: new Date().toISOString(),
    is_paid: isPaid,
    status: 'searching',
  });

  // Use PostgreSQL advisory lock to prevent race condition in match creation
  // Lock key based on the two uids (sorted to be consistent)
  const lockKey = uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  const { data: matchResult, error: matchErr } = await supabaseAdmin.rpc('try_create_spar_match', {
    p_uid: uid,
    p_is_paid: isPaid,
    p_lock_key: lockKey,
  });

  if (matchErr) {
    console.error('[spar/queue/join] match create', matchErr);
    return NextResponse.json({ error: 'Failed to create match.' }, { status: 500 });
  }

  if (!matchResult || matchResult.status === 'searching') {
    return NextResponse.json({ status: 'searching' });
  }

  return NextResponse.json({
    status: 'matched',
    matchId: matchResult.match_id,
    opponentUid: matchResult.opponent_uid,
    commandSequence: matchResult.command_sequence,
    signalingChannel: `spar-${matchResult.match_id}`,
    isPaidMatch: matchResult.is_paid_match,
    role: matchResult.role,
  });
}
