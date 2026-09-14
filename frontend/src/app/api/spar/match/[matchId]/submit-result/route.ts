import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import {
  computeSparScore,
  computeReflexScore,
  normalizePowerAndForm,
  pickWinner,
  validateSparResult,
  type SparCommand,
  type SparResultBreakdown,
} from '@/lib/server/spar';

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

  const matchId = params.matchId;
  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));
  const breakdown = body.breakdown as SparResultBreakdown;

  const { data: match, error: matchErr } = await supabaseAdmin
    .from('spar_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  }
  if (match.player_a_uid !== uid && match.player_b_uid !== uid) {
    return NextResponse.json({ error: 'Not a participant.' }, { status: 403 });
  }
  if (['completed', 'abandoned'].includes(match.status)) {
    return NextResponse.json({ error: 'Match already finished.' }, { status: 409 });
  }

  const sequence = (match.command_sequence || []) as SparCommand[];
  const check = validateSparResult(sequence, breakdown);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const normalized: SparResultBreakdown = {
    ...breakdown,
    ...normalizePowerAndForm(breakdown),
    reflexScore: computeReflexScore(breakdown.avgReactionMs ?? null),
    score: computeSparScore(breakdown),
  };

  const { error: idemErr } = await supabaseAdmin.from('spar_result_submissions').insert({
    match_id: matchId,
    uid,
  });
  if (idemErr) {
    if (idemErr.code === '23505') {
      return NextResponse.json({ error: 'Result already submitted.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to record submission.' }, { status: 500 });
  }

  const isA = match.player_a_uid === uid;
  const patch: Record<string, unknown> = {
    status: 'awaiting_results',
  };
  if (isA) patch.player_a_result = normalized;
  else patch.player_b_result = normalized;

  await supabaseAdmin.from('spar_matches').update(patch).eq('id', matchId);

  const { data: fresh } = await supabaseAdmin
    .from('spar_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (fresh?.player_a_result && fresh?.player_b_result) {
    const winner = pickWinner(
      fresh.player_a_uid,
      fresh.player_b_uid,
      fresh.player_a_result as SparResultBreakdown,
      fresh.player_b_result as SparResultBreakdown,
    );
    await supabaseAdmin
      .from('spar_matches')
      .update({
        winner_uid: winner,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (fresh.is_paid_match) {
      await upsertLeaderboard(fresh.player_a_uid, fresh.player_b_uid, winner);
    }

    await supabaseAdmin.from('spar_queue').delete().in('uid', [fresh.player_a_uid, fresh.player_b_uid]);
  }

  return NextResponse.json({ ok: true, softFlags: check.softFlags });
}

async function upsertLeaderboard(aUid: string, bUid: string, winnerUid: string) {
  if (!supabaseAdmin) return;
  for (const uid of [aUid, bUid]) {
    const { data: profile } = await supabaseAdmin
      .from('reflex_profiles')
      .select('display_name')
      .eq('uid', uid)
      .maybeSingle();
    const name = (profile?.display_name || 'FIGHTER').toUpperCase();
    const won = uid === winnerUid;
    const { data: existing } = await supabaseAdmin
      .from('spar_leaderboard')
      .select('wins, losses')
      .eq('uid', uid)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from('spar_leaderboard').insert({
        uid,
        display_name: name,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        updated_at: new Date().toISOString(),
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
        .eq('uid', uid);
    }
  }
}
