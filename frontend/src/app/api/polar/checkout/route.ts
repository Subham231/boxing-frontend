import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';
import {
  createPolarCheckout,
  polarCheckoutConfigured,
  polarEnvironment,
  describePolarError,
  customerFacingPolarError,
} from '@/lib/server/polar';
import { resolvePlanPricing } from '@/lib/server/polar-pricing';
import {
  resolvePaymentProvider,
  resolveCountryConfig,
  detectCountryFromRequest,
  isSuspiciousCountryClaim,
} from '@/lib/server/country-config';
import { getLaunchStatus } from '@/lib/launch-status';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ error: 'Subscriptions open at launch.' }, { status: 403 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) {
    return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }
  const uid = decoded.uid;

  const body = await req.json().catch(() => ({}));
  const planId = body.planId as PlanId;
  const clientCountry = String(body.country || '').toUpperCase();
  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  // The frontend never dictates provider/price — only a country, and even
  // that is cross-checked against a server-side geo signal when one exists.
  const geoCountry = detectCountryFromRequest(req);
  if (isSuspiciousCountryClaim(geoCountry, clientCountry)) {
    return NextResponse.json(
      { error: 'Country could not be verified for this payment method. Please refresh and try again.' },
      { status: 403 },
    );
  }

  const effectiveCountry = clientCountry || geoCountry || 'US';
  const provider = resolvePaymentProvider(effectiveCountry);

  if (provider !== 'polar') {
    return NextResponse.json(
      { error: 'This endpoint is for international checkout only. Indian accounts use /api/subscription/create-order.' },
      { status: 400 },
    );
  }

  // Only the access token is needed to CREATE a checkout; the webhook secret
  // is for receiving webhooks. Requiring both blocked checkout for no reason.
  if (!polarCheckoutConfigured()) {
    console.error('[polar checkout] POLAR_ACCESS_TOKEN is not set on the server.');
    return NextResponse.json({ error: 'Payments are temporarily unavailable. Please contact support.' }, { status: 500 });
  }
  if (!plan.polarProductId) {
    return NextResponse.json({ error: `Polar product id for '${plan.name}' is not configured on the server.` }, { status: 500 });
  }

  const countryConfig = resolveCountryConfig(effectiveCountry);
  // Behind a proxy nextUrl.origin can be the internal host, so prefer the
  // browser's Origin, then the forwarded host, then nextUrl.
  const fwdHost = req.headers.get('x-forwarded-host');
  const fwdProto = req.headers.get('x-forwarded-proto') || 'https';
  const origin = req.headers.get('origin') || (fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin);
  const successUrl = `${origin}/subscription/success?checkout_id={CHECKOUT_ID}&planId=${planId}`;

  try {
    // Present the checkout in the same currency the pricing endpoint showed.
    const pricing = await resolvePlanPricing(planId, countryConfig);
    const checkout = await createPolarCheckout({
      productId: plan.polarProductId,
      uid,
      planId,
      successUrl,
      customerEmail: decoded.email || undefined,
      currency: pricing.source === 'polar' ? pricing.currency.toLowerCase() : undefined,
    });

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('reflex_profiles')
        .update({
          polar_checkout_id: checkout.id,
          payment_provider: 'polar',
          country_code: countryConfig.code,
          currency_code: pricing.currency,
        })
        .eq('uid', uid);
    }

    return NextResponse.json({ checkoutUrl: checkout.url, checkoutId: checkout.id, planId, provider: 'polar' });
  } catch (error) {
    const { status, detail } = describePolarError(error);
    console.error(`[polar checkout] failed (env=${polarEnvironment()}, product=${plan.polarProductId}, status=${status}): ${detail}`);
    return NextResponse.json({ error: customerFacingPolarError(error) }, { status: 502 });
  }
}
