import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { getEntitlement } from '@/lib/server/entitlements';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

/** Spar allowance status for lobby / watch-ad UI. Does not consume credit. */
export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const entitlement = await getEntitlement(auth.uid);

  const [{ count: queueOnline }, { data: rankRow }] = await Promise.all([
    supabaseAdmin
      .from('spar_queue')
      .select('uid', { count: 'exact', head: true })
      .eq('status', 'searching'),
    supabaseAdmin
      .from('spar_leaderboard')
      .select('wins, losses')
      .eq('uid', auth.uid)
      .maybeSingle(),
  ]);
  const wins = rankRow?.wins || 0;
  const losses = rankRow?.losses || 0;
  const matches = wins + losses;
  const mmr = matches ? Math.round(1000 + wins * 210 + (wins / matches) * 420) : null;
  const rankLabel = mmr == null ? 'UNRANKED' : mmr >= 1400 ? 'DIAMOND' : mmr >= 1200 ? 'PLATINUM' : mmr >= 1000 ? 'GOLD' : 'SILVER';
  const liveQueue = queueOnline || 0;
  const lobbyData = {
    queueOnline: liveQueue,
    estimatedWaitSeconds: liveQueue > 20 ? 12 : liveQueue > 5 ? 24 : 45,
    rankLabel,
    mmr,
  };

  if (entitlement.active) {
    const limit = entitlement.sparDailyLimit;
    const used = entitlement.sparDailyUsed;
    const remaining = limit < 0 ? -1 : Math.max(0, limit - used);
    return NextResponse.json({
      ...lobbyData,
      mode: 'paid',
      active: true,
      planName: entitlement.planName,
      sparDailyLimit: limit,
      sparDailyUsed: used,
      remaining,
      canSpar: limit < 0 || used < limit,
      freeSparAvailable: false,
      freeSparUnlocked: false,
      needsAd: false,
    });
  }

  const used = entitlement.sparDailyUsed || 0;
  const canSpar = used < 1;

  return NextResponse.json({
    ...lobbyData,
    mode: 'free',
    active: false,
    planName: null,
    sparDailyLimit: 1,
    sparDailyUsed: used,
    remaining: canSpar ? 1 : 0,
    canSpar,
    freeSparAvailable: canSpar,
    freeSparUnlocked: true,
    needsAd: false,
  });
}
