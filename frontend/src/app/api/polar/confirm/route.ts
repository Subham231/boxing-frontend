import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { planIdFromPolarProductId } from '@/lib/server/entitlements';
import {
  getPolarCheckout,
  findPolarSubscription,
  getPolarSubscription,
  polarCheckoutConfigured,
} from '@/lib/server/polar';
import { syncSubscriptionFromPolar, type PolarSubscriptionLike } from '@/lib/server/sync-subscription-polar';

export const runtime = 'nodejs';

// POST { checkoutId } — called by the checkout success page. It asks Polar
// directly whether this checkout succeeded and, if so, syncs the resulting
// subscription into the profile. This is the safety net for a late, failed or
// not-yet-configured webhook: the customer has paid, so activation must not
// depend on a webhook arriving. The webhook stays the primary path; syncing is
// idempotent, so both running is fine.
export async function POST(req: NextRequest) {
  const idToken = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!idToken) return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });

  let uid: string;
  try {
    uid = (await verifyFirebaseIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const checkoutId = String(body.checkoutId || '');
  if (!checkoutId || checkoutId.includes('{')) {
    return NextResponse.json({ error: 'Missing checkout id.' }, { status: 400 });
  }
  if (!polarCheckoutConfigured() || !supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 503 });
  }

  const checkout = (await getPolarCheckout(checkoutId)) as unknown as {
    status?: string;
    productId?: string;
    customerId?: string | null;
    externalCustomerId?: string | null;
    currency?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  if (!checkout) return NextResponse.json({ error: 'Checkout not found.' }, { status: 404 });

  // A signed-in user may only confirm their own checkout.
  const owner = checkout.externalCustomerId || (checkout.metadata?.sparai_uid as string | undefined) || null;
  if (owner !== uid) return NextResponse.json({ error: 'Not your checkout.' }, { status: 403 });

  const state = String(checkout.status || '');
  if (state !== 'succeeded' && state !== 'confirmed') {
    return NextResponse.json({ synced: false, checkoutStatus: state });
  }

  const sub = await findPolarSubscription({ uid, customerId: checkout.customerId, productId: checkout.productId });
  if (!sub) {
    // Paid, but Polar hasn't attached the subscription yet — caller retries.
    return NextResponse.json({ synced: false, checkoutStatus: state, pending: true });
  }

  const live = ((await getPolarSubscription(sub.id)) || sub) as PolarSubscriptionLike;
  if (!planIdFromPolarProductId(live.productId || live.product_id || checkout.productId)) {
    console.error('[polar confirm] checkout product does not map to a plan', checkout.productId);
    return NextResponse.json({ error: 'Unknown product for this checkout.' }, { status: 422 });
  }

  const result = await syncSubscriptionFromPolar({
    uid,
    polarSub: live,
    country: null,
    currency: checkout.currency ? String(checkout.currency).toUpperCase() : null,
    eventType: 'checkout.confirm',
  });
  return NextResponse.json({ synced: result.ok, checkoutStatus: state });
}
