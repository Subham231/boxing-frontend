import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS } from '@/lib/server/entitlements';

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

  // Handle Subscription events
  const subscriptionEntity = payload.subscription?.entity;
  const paymentEntity = payload.payment?.entity;

  const notes = subscriptionEntity?.notes || paymentEntity?.notes || {};
  const subId = subscriptionEntity?.id || paymentEntity?.subscription_id;
  const uidFromNotes = notes.uid || '';
  const planIdFromNotes = notes.planId || '';

  // Helper to find profile by subscription ID or fallback to UID
  async function findUid(): Promise<string | null> {
    if (uidFromNotes) return uidFromNotes;
    if (subId) {
      const { data } = await supabaseAdmin!
        .from('reflex_profiles')
        .select('uid')
        .eq('razorpay_subscription_id', subId)
        .maybeSingle();
      if (data) return data.uid;
    }
    return null;
  }

  // 1. Subscription Authenticated / Activated / Charged
  if (
    eventType === 'subscription.authenticated' ||
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'payment.captured'
  ) {
    const uid = await findUid();
    if (!uid) {
      console.warn('[webhook] User not found for subscription event', { eventType, subId });
      return NextResponse.json({ status: 'ignored' });
    }

    // Determine period dates from Razorpay
    let startIso: string;
    let endIso: string;

    if (subscriptionEntity?.current_start && subscriptionEntity?.current_end) {
      startIso = new Date(subscriptionEntity.current_start * 1000).toISOString();
      endIso = new Date(subscriptionEntity.current_end * 1000).toISOString();
    } else {
      const now = new Date();
      startIso = now.toISOString();
      const planConfig = PLANS[planIdFromNotes as keyof typeof PLANS] || PLANS.monthly;
      const exp = new Date();
      exp.setDate(exp.getDate() + planConfig.durationDays);
      endIso = exp.toISOString();
    }

    let planIdToSet = planIdFromNotes;
    if (!planIdToSet && subscriptionEntity?.plan_id) {
      for (const [key, config] of Object.entries(PLANS)) {
        if (config.razorpayPlanId === subscriptionEntity.plan_id) {
          planIdToSet = key;
          break;
        }
      }
    }
    if (!planIdToSet) planIdToSet = 'monthly';
    const planConfig = PLANS[planIdToSet as keyof typeof PLANS] || PLANS.monthly;

    // Record ledger idempotently if payment is present
    if (paymentEntity?.id) {
      await supabaseAdmin
        .from('subscription_payments')
        .upsert(
          {
            razorpay_payment_id: paymentEntity.id,
            razorpay_subscription_id: subId || null,
            uid,
            plan: planIdToSet,
            amount_paise: paymentEntity.amount || planConfig.priceInPaise,
            status: 'captured',
            event_type: eventType,
            created_at: new Date().toISOString(),
          },
          { ignoreDuplicates: true, onConflict: 'razorpay_payment_id' },
        );
    }

    // Update profile subscription state
    const { error: updateError } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        plan: planIdToSet,
        plan_started_at: startIso,
        plan_expires_at: endIso,
        razorpay_subscription_id: subId || undefined,
        razorpay_plan_id: subscriptionEntity?.plan_id || planConfig.razorpayPlanId,
        subscription_status: subscriptionEntity?.status || 'active',
        current_period_start: startIso,
        current_period_end: endIso,
        is_elite: planConfig.isElite,
        daily_analysis_count: 0,
        daily_analysis_date: null,
        weekly_planner_count: 0,
        weekly_planner_week: null,
      })
      .eq('uid', uid);

    if (updateError) {
      console.error('[webhook] profile update failed', updateError);
    }
    return NextResponse.json({ status: 'ok' });
  }

  // 2. Subscription Halted / Cancelled / Expired / Payment Failed
  if (
    eventType === 'subscription.halted' ||
    eventType === 'subscription.cancelled' ||
    eventType === 'subscription.completed' ||
    eventType === 'payment.failed'
  ) {
    const uid = await findUid();
    if (uid) {
      const newStatus = eventType === 'subscription.halted' ? 'halted' : eventType === 'subscription.cancelled' ? 'cancelled' : 'expired';
      
      // Update subscription status. Crucially: DO NOT extend current_period_end/plan_expires_at.
      // If halted/expired and current period is past, getEntitlement will block access.
      await supabaseAdmin
        .from('reflex_profiles')
        .update({
          subscription_status: newStatus,
        })
        .eq('uid', uid);
    }
    return NextResponse.json({ status: 'ok' });
  }

  return NextResponse.json({ status: 'ignored' });
}
