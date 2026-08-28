import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { isDevSkipAllowed } from '@/lib/server/env';
import { verifyGoogleAdManagerReward } from '@/lib/server/ad-manager';

export const runtime = 'nodejs';

/**
 * Google Ad Manager / rewarded ad verification hook.
 *
 * This is intentionally structured so the app can accept a real GAM callback
 * when the ad account is ready, while still letting local/dev testing unlock
 * the free spar flow without the production provider credentials.
 *
 * Planned prod integration:
 * - GAM SSV callback -> /api/spar/ad-reward
 * - custom_data / user_id -> Firebase uid
 * - optional signature validation with GAM_SSV_SECRET
 * - provider-specific metadata hooks can be added in @/lib/server/ad-manager.ts
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const contentType = req.headers.get('content-type') || '';
  const url = new URL(req.url);

  // --- Dev unlock (never in production) ---
  if (isDevSkipAllowed() && process.env.SPAR_AD_DEV_UNLOCK === 'true' && contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    const uid = typeof body.uid === 'string' ? body.uid : '';
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('unlock_free_spar_ad', { p_uid: uid });
    if (error) {
      console.error('[spar/ad-reward] unlock rpc', error);
      return NextResponse.json({ error: 'Unlock failed. Run the free-spar SQL migration.' }, { status: 500 });
    }

    return NextResponse.json({ unlocked: !!data, provider: 'dev', mode: 'dev' });
  }

  const body = await req.json().catch(() => ({}));
  const verification = verifyGoogleAdManagerReward(url, req.headers, body);

  if (!verification.ok || !verification.uid) {
    return NextResponse.json(
      {
        error: verification.reason || 'Reward verification failed.',
        provider: verification.provider,
        metadata: verification.metadata,
      },
      { status: verification.reason?.includes('not configured') ? 503 : 401 },
    );
  }

  const uid = verification.uid;
  const { data, error } = await supabaseAdmin.rpc('unlock_free_spar_ad', { p_uid: uid });
  if (error) {
    console.error('[spar/ad-reward] unlock rpc', error);
    return NextResponse.json({ error: 'Unlock failed', provider: verification.provider }, { status: 500 });
  }

  return NextResponse.json({
    unlocked: !!data,
    provider: verification.provider,
    metadata: verification.metadata,
  });
}
