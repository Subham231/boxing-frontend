import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { getEntitlement } from '@/lib/server/entitlements';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { shouldGateResultReveal } from '@/lib/server/spar';
import { getFighterCard } from '@/lib/server/fighterCard';

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

  const isA = match.player_a_uid === uid;
  const opponentUid = isA ? match.player_b_uid : match.player_a_uid;
  const mine = (isA ? match.player_a_result : match.player_b_result) || null;
  const theirs = (isA ? match.player_b_result : match.player_a_result) || null;
  const [youCard, oppCard] = await Promise.all([getFighterCard(uid), getFighterCard(opponentUid)]);
  const { uid: _omit, ...opponent } = oppCard;
  void _omit;

  const locked = !entitlement.active;

  // Server-side gate: a free fighter only ever receives the scoreboard
  // (winner, overall score, landed count). The merit breakdown — accuracy,
  // reflex, power, stability, form, reaction time, per-command detail — is
  // simply not sent, so it can't be unlocked by editing the page.
  const scoreboard = (r: any) =>
    r ? { score: r.score ?? null, hits: r.hits ?? null, misses: r.misses ?? null, commandsResponded: r.commandsResponded ?? null } : null;

  return NextResponse.json({
    status: 'completed',
    gated: false,
    winnerUid: match.winner_uid,
    youWon: match.winner_uid === uid,
    yourScore: mine?.score ?? null,
    opponentScore: theirs?.score ?? null,
    yourResult: locked ? scoreboard(mine) : mine,
    opponentResult: locked ? scoreboard(theirs) : theirs,
    isPaidMatch: match.is_paid_match,
    // Whether the VIEWER has an active subscription — separate from
    // isPaidMatch (the tier both fighters were paired at). Gates the merits.
    isPremiumLocked: locked,
    you: youCard,
    opponent,
  });
}
