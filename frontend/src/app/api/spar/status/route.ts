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

  if (entitlement.active) {
    const limit = entitlement.sparDailyLimit;
    const used = entitlement.sparDailyUsed;
    const remaining = limit < 0 ? -1 : Math.max(0, limit - used);
    return NextResponse.json({
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
