import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Razorpay payment webhook
//
// Receives asynchronous payment events from Razorpay after the user closes
// the checkout modal. The client-side handler also calls verify-payment, but
// this webhook is the authoritative source of truth — it catches payments
// that completed even if the user closed the browser before the handler ran.
//
// Set RAZORPAY_WEBHOOK_SECRET in your env vars, and configure the webhook
// URL in the Razorpay dashboard to point to /api/razorpay/webhook.
// ---------------------------------------------------------------------------

function verifySignature(
  body: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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

  const eventType = event.event;
  const payload = event.payload || {};
  const payment = payload.payment?.entity;
  const order = payload.order?.entity;

  if (eventType === 'payment.captured') {
    const paymentId = payment?.id;
    const orderId = payment?.order_id;
    const notes = payment?.notes || order?.notes || {};
    const planId = notes.planId || '';
    const uid = notes.uid || '';

    if (!paymentId || !orderId || !planId || !uid) {
      // Missing metadata — the order may have been created outside our flow.
      // Log and acknowledge so Razorpay doesn't retry.
      console.warn('[webhook] incomplete payment.captured payload', { paymentId, orderId, planId, uid });
      return NextResponse.json({ status: 'ignored' });
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      console.warn('[webhook] unknown plan', { planId });
      return NextResponse.json({ status: 'ignored' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    // Insert payment ledger entry (idempotent on razorpay_payment_id).
    const { error: ledgerError } = await supabaseAdmin
      .from('subscription_payments')
      .upsert(
        {
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          uid,
          plan: planId,
          amount: payment.amount || 0,
          currency: payment.currency || 'INR',
          status: 'captured',
          created_at: new Date().toISOString(),
        },
        { ignoreDuplicates: false, onConflict: 'razorpay_payment_id' },
      )
      .eq('razorpay_payment_id', paymentId);

    if (ledgerError) {
      console.error('[webhook] ledger insert failed', ledgerError);
      // Don't return 5xx — Razorpay would retry and we'd have duplicate
      // rows. Acknowledge the event.
      return NextResponse.json({ status: 'accepted' });
    }

    // Activate / extend the profile's subscription plan.
    const { error: updateError } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        plan: planId,
        plan_started_at: new Date().toISOString(),
        plan_expires_at: expiresAt.toISOString(),
        is_elite: plan.isElite,
        daily_analysis_count: 0,
        daily_analysis_date: null,
        weekly_planner_count: 0,
        weekly_planner_week: null,
      })
      .eq('uid', uid);

    if (updateError) {
      console.error('[webhook] profile update failed', updateError);
      return NextResponse.json({ status: 'accepted' });
    }

    return NextResponse.json({ status: 'ok' });
  }

  if (eventType === 'payment.failed') {
    console.warn('[webhook] payment failed', {
      paymentId: payment?.id,
      errorCode: payment?.error_code,
      errorDescription: payment?.error_description,
    });
    return NextResponse.json({ status: 'logged' });
  }

  // Acknowledge all other event types without action.
  return NextResponse.json({ status: 'ignored' });
}
