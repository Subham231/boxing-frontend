import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { verifyPolarWebhook, getPolarSubscription } from '@/lib/server/polar';
import { markWebhookEventProcessed } from '@/lib/server/sync-subscription';
import {
  syncSubscriptionFromPolar,
  findUidForPolarSubscription,
  polarEventKey,
  type PolarSubscriptionLike,
} from '@/lib/server/sync-subscription-polar';

export const runtime = 'nodejs';

// Events this handler acts on. Anything else (checkout.*, customer.*,
// order.created/refunded without a subscription attached, etc.) is
// acknowledged but ignored — see section 6 of the integration spec.
const HANDLED_SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.active',
  'subscription.updated',
  'subscription.canceled',
  'subscription.uncanceled',
  'subscription.past_due',
  'subscription.revoked',
]);
const HANDLED_ORDER_EVENTS = new Set(['order.created', 'order.paid', 'order.refunded']);

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  // Raw body is read ONCE, before any JSON parsing, and handed straight to
  // validateEvent() — never JSON.parse-then-restringify before verification
  // (Standard Webhooks signatures are computed over the exact raw bytes).
  const rawBody = await req.text();

  let event: any;
  try {
    event = await verifyPolarWebhook(rawBody, req.headers);
  } catch (err) {
    console.warn('[polar webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const eventType: string = event?.type || '';
  const data = event?.data || {};

  // Polar doesn't put its own top-level "event id" in the validated payload
  // the same way Razorpay does — the Standard Webhooks `webhook-id` header
  // is the actual delivery id, so idempotency keys off that header, not
  // the resource id (a resource can appear in many different deliveries).
  const webhookId = req.headers.get('webhook-id') || `${eventType}:${data?.id || 'none'}`;
  const eventKey = polarEventKey(webhookId);

  const fresh = await markWebhookEventProcessed(eventKey, eventType);
  if (!fresh) {
    return NextResponse.json({ status: 'duplicate' });
  }

  const isSubscriptionEvent = HANDLED_SUBSCRIPTION_EVENTS.has(eventType);
  const isOrderEvent = HANDLED_ORDER_EVENTS.has(eventType);

  if (!isSubscriptionEvent && !isOrderEvent) {
    return NextResponse.json({ status: 'ignored' });
  }

  // For order events, the subscription (if any) lives at data.subscriptionId.
  const subscriptionRef: PolarSubscriptionLike | null = isSubscriptionEvent
    ? (data as PolarSubscriptionLike)
    : data?.subscription || (data?.subscriptionId ? { id: data.subscriptionId } : null);

  if (!subscriptionRef?.id) {
    // A one-time order with no subscription attached — nothing for the
    // subscription entitlement system to do.
    return NextResponse.json({ status: 'ignored' });
  }

  const metadataUid = (data?.metadata?.sparai_uid as string | undefined) || null;
  const externalCustomerId = (data?.customer?.externalId as string | undefined) || null;
  const customerId = subscriptionRef.customerId || subscriptionRef.customer_id || null;

  const uid = await findUidForPolarSubscription({
    externalCustomerId,
    metadataUid,
    subscriptionId: subscriptionRef.id,
    customerId,
  });

  if (!uid) {
    console.warn('[polar webhook] user not found for subscription event', { eventType, subId: subscriptionRef.id });
    return NextResponse.json({ status: 'ignored' });
  }

  // Always re-fetch the live subscription so dates/status come from Polar
  // itself, never trusted purely from the webhook payload shape.
  const live = (await getPolarSubscription(subscriptionRef.id)) || subscriptionRef;
  if (!live?.id) {
    return NextResponse.json({ status: 'ignored' });
  }

  const paymentFromOrder = isOrderEvent && data?.id
    ? { id: data.id, amount: data.totalAmount ?? data.amount ?? null, status: data.status ?? eventType.split('.')[1] }
    : null;

  const result = await syncSubscriptionFromPolar({
    uid,
    polarSub: live as PolarSubscriptionLike,
    payment: paymentFromOrder,
    country: (data?.customer?.billingAddress?.country as string | undefined) || null,
    currency: (data?.currency as string | undefined) || null,
    eventType,
  });

  if (!result.ok) {
    await supabaseAdmin.from('processed_webhook_events').delete().eq('event_id', eventKey);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
