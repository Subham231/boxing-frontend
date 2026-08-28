import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { fetchRazorpaySubscription } from '@/lib/server/razorpay';
import { markWebhookEventProcessed, syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';

export const runtime = 'nodejs';

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function findUid(uidFromNotes: string, subId: string | undefined): Promise<string | null> {
  if (uidFromNotes) return uidFromNotes;
  if (!subId || !supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();
  return data?.uid || null;
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('x-razorpay-signature');
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const eventType: string = event.event || '';
  const payload = event.payload || {};
  const subscriptionEntity = payload.subscription?.entity;
  const paymentEntity = payload.payment?.entity;
  const notes = subscriptionEntity?.notes || paymentEntity?.notes || {};
  const subId: string | undefined = subscriptionEntity?.id || paymentEntity?.subscription_id;
  const uidFromNotes = notes.uid || '';

  const eventId =
    event.id ||
    `${eventType}:${subId || 'none'}:${paymentEntity?.id || event.created_at || 'none'}`;

  const fresh = await markWebhookEventProcessed(eventId, eventType);
  if (!fresh) {
    return NextResponse.json({ status: 'duplicate' });
  }

  const handled =
    eventType === 'subscription.authenticated' ||
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'subscription.pending' ||
    eventType === 'subscription.halted' ||
    eventType === 'subscription.cancelled' ||
    eventType === 'subscription.completed' ||
    eventType === 'subscription.updated' ||
    eventType === 'payment.captured' ||
    eventType === 'payment.failed';

  if (!handled || !subId) {
    return NextResponse.json({ status: 'ignored' });
  }

  const uid = await findUid(uidFromNotes, subId);
  if (!uid) {
    console.warn('[webhook] User not found for subscription event', { eventType, subId });
    return NextResponse.json({ status: 'ignored' });
  }

  // Always re-fetch the live subscription so dates come from Razorpay, not the client.
  const live = (await fetchRazorpaySubscription(subId)) || subscriptionEntity;
  if (!live?.id) {
    return NextResponse.json({ status: 'ignored' });
  }

  const result = await syncSubscriptionFromRazorpay({
    uid,
    razorpaySub: live,
    payment: paymentEntity?.id
      ? { id: paymentEntity.id, amount: paymentEntity.amount, status: paymentEntity.status, subscription_id: subId, notes: paymentEntity.notes }
      : null,
    eventType,
  });

  if (!result.ok) {
    await supabaseAdmin.from('processed_webhook_events').delete().eq('event_id', eventId);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
