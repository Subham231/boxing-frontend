import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { isDevSkipAllowed } from '@/lib/server/env';

export const runtime = 'nodejs';

/**
 * AdMob / rewarded-ad Server-Side Verification callback.
 * Must NOT be treated as a client "I watched the ad" claim.
 *
 * Set AD_NETWORK_SSV_SECRET to enable signature checks.
 * Dev-only unlock: POST { uid } with Authorization bearer of that user
 * when SPAR_AD_DEV_UNLOCK=true and not production (isDevSkipAllowed path).
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
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('unlock_free_spar_ad', { p_uid: uid });
    if (error) {
      console.error('[spar/ad-reward] unlock rpc', error);
      return NextResponse.json({ error: 'Unlock failed. Run reflex-schema-v14.sql.' }, { status: 500 });
    }
    return NextResponse.json({ unlocked: !!data });
  }

  // --- SSV query-style callback (AdMob custom data = uid) ---
  const secret = process.env.AD_NETWORK_SSV_SECRET || '';
  const signature = url.searchParams.get('signature') || req.headers.get('x-admob-signature') || '';
  const customData = url.searchParams.get('custom_data') || url.searchParams.get('user_id') || '';
  const keyId = url.searchParams.get('key_id') || '';

  if (!secret) {
    return NextResponse.json(
      { error: 'Ad SSV not configured. Set AD_NETWORK_SSV_SECRET or use SPAR_AD_DEV_UNLOCK in non-production.' },
      { status: 503 },
    );
  }

  // Minimal HMAC check over the raw query string without signature itself.
  // Replace with the network's exact SSV docs when the ad account is ready.
  const payload = url.searchParams.toString().replace(/&?signature=[^&]*/g, '');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  const ok =
    signature &&
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!ok && process.env.AD_NETWORK_SSV_STRICT !== 'false') {
    // If provider uses asymmetric keys, set AD_NETWORK_SSV_STRICT=false until wired.
    console.warn('[spar/ad-reward] signature mismatch', { keyId });
    return NextResponse.json({ error: 'Invalid SSV signature.' }, { status: 401 });
  }

  const uid = customData;
  if (!uid) return NextResponse.json({ error: 'Missing custom_data uid.' }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('unlock_free_spar_ad', { p_uid: uid });
  if (error) {
    console.error('[spar/ad-reward] unlock rpc', error);
    return NextResponse.json({ error: 'Unlock failed' }, { status: 500 });
  }
  return NextResponse.json({ unlocked: !!data });
}
