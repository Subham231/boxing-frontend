import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { getEntitlement } from '@/lib/server/entitlements';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateSparCommandSequence } from '@/lib/server/spar';

export const runtime = 'nodejs';

async function purgeOldFreeMatches() {
  if (!supabaseAdmin) return;
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('spar_matches')
    .delete()
    .eq('is_paid_match', false)
    .lt('created_at', cutoff);
}

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const uid = auth.uid;
  await purgeOldFreeMatches();

  // Clear stale queue rows older than 3 minutes
  const staleBefore = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await supabaseAdmin.from('spar_queue').delete().eq('status', 'searching').lt('joined_at', staleBefore);

  const entitlement = await getEntitlement(uid);
  const isPaid = entitlement.active;

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
          error: 'Watch an ad to spar today.',
          reason: 'needs_ad',
          needsAd: true,
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

  // Check-on-read matching (no background timer)
  const { data: waiting } = await supabaseAdmin
    .from('spar_queue')
    .select('uid, is_paid')
    .eq('status', 'searching')
    .neq('uid', uid)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waiting) {
    return NextResponse.json({ status: 'searching' });
  }

  const opponentUid = waiting.uid as string;
  const isPaidMatch = isPaid && !!waiting.is_paid;
  const commandSequence = generateSparCommandSequence();
  const playerA = uid < opponentUid ? uid : opponentUid;
  const playerB = uid < opponentUid ? opponentUid : uid;

  const { data: match, error: matchErr } = await supabaseAdmin
    .from('spar_matches')
    .insert({
      player_a_uid: playerA,
      player_b_uid: playerB,
      is_paid_match: isPaidMatch,
      command_sequence: commandSequence,
      status: 'pending',
    })
    .select('id')
    .single();

  if (matchErr || !match) {
    console.error('[spar/queue/join] match create', matchErr);
    return NextResponse.json({ error: 'Failed to create match.' }, { status: 500 });
  }

  await supabaseAdmin.from('spar_queue').update({ status: 'matched' }).in('uid', [uid, opponentUid]);

  return NextResponse.json({
    status: 'matched',
    matchId: match.id,
    opponentUid,
    commandSequence,
    signalingChannel: `spar-${match.id}`,
    isPaidMatch,
    role: uid === playerA ? 'offer' : 'answer',
  });
}
