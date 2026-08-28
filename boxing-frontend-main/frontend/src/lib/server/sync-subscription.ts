// SERVER-ONLY. Single writer for Razorpay → reflex_profiles.
// Webhook, reconcile, and verify-payment all call this so they cannot drift.
import { supabaseAdmin } from './supabase-admin';
import { PLANS, PlanId } from './entitlements';
import type { RazorpayPayment, RazorpaySubscription } from './razorpay';

const PAID_GRANT_STATUSES = new Set(['active', 'authenticated', 'pending']);
const PERIOD_KEEP_STATUSES = new Set(['cancelled', 'halted']);

export function planIdFromRazorpay(
  sub: RazorpaySubscription | null | undefined,
  payment?: RazorpayPayment | null,
): PlanId | null {
  const notes = sub?.notes || payment?.notes || {};
  const fromNotes = notes.planId as PlanId | undefined;
  if (fromNotes && PLANS[fromNotes]) return fromNotes;

  const razorpayPlanId = sub?.plan_id;
  if (razorpayPlanId) {
    for (const [key, config] of Object.entries(PLANS)) {
      if (config.razorpayPlanId === razorpayPlanId) return key as PlanId;
    }
  }
  return null;
}

function unixToIso(unix?: number | null): string | null {
  if (!unix || unix <= 0) return null;
  return new Date(unix * 1000).toISOString();
}

export async function markWebhookEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  if (!supabaseAdmin || !eventId) return false;
  const { error } = await supabaseAdmin.from('processed_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
  });
  if (!error) return true;
  if (error.code === '23505') return false; // already processed
  if (error.code === '42P01' || /does not exist|processed_webhook_events/i.test(error.message || '')) {
    return true; // table not migrated yet — still process the event
  }
  console.error('[sync-subscription] webhook idempotency insert failed', error);
  return true;
}

export async function syncSubscriptionFromRazorpay(opts: {
  uid: string;
  razorpaySub: RazorpaySubscription;
  payment?: RazorpayPayment | null;
  eventType?: string;
}): Promise<{ ok: boolean; paymentAlreadyRecorded: boolean }> {
  if (!supabaseAdmin) return { ok: false, paymentAlreadyRecorded: false };

  const { uid, razorpaySub, payment, eventType } = opts;
  const rzpStatus = (razorpaySub.status || '').toLowerCase();
  const planId = planIdFromRazorpay(razorpaySub, payment);
  const planConfig = planId ? PLANS[planId] : null;

  const startIso = unixToIso(razorpaySub.current_start);
  const endIso = unixToIso(razorpaySub.current_end);

  const { data: existing } = await supabaseAdmin
    .from('reflex_profiles')
    .select('plan, current_period_start, current_period_end, daily_analysis_count, daily_analysis_date, weekly_planner_count, weekly_planner_week')
    .eq('uid', uid)
    .maybeSingle();

  let paymentAlreadyRecorded = false;
  if (payment?.id) {
    const { error: insertError } = await supabaseAdmin.from('subscription_payments').insert({
      uid,
      razorpay_payment_id: payment.id,
      razorpay_subscription_id: razorpaySub.id,
      plan: planId || existing?.plan || 'monthly',
      amount_paise: payment.amount || planConfig?.priceInPaise || 0,
      status: payment.status === 'captured' ? 'captured' : 'verified',
      event_type: eventType || 'reconcile',
    });
    if (insertError?.code === '23505') {
      paymentAlreadyRecorded = true;
    } else if (insertError) {
      console.error('[sync-subscription] payment ledger insert failed', insertError);
    }
  }

  // Failed / ended subscriptions: never extend dates. Keep remaining paid period.
  if (!PAID_GRANT_STATUSES.has(rzpStatus) && !PERIOD_KEEP_STATUSES.has(rzpStatus)) {
    const { error } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        razorpay_subscription_id: razorpaySub.id,
        razorpay_plan_id: razorpaySub.plan_id || undefined,
        subscription_status: rzpStatus || 'expired',
      })
      .eq('uid', uid);
    if (error) console.error('[sync-subscription] status-only update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  if (PERIOD_KEEP_STATUSES.has(rzpStatus)) {
    const patch: Record<string, unknown> = {
      razorpay_subscription_id: razorpaySub.id,
      razorpay_plan_id: razorpaySub.plan_id || undefined,
      subscription_status: rzpStatus,
    };
    if (planId) patch.plan = planId;
    if (startIso) patch.current_period_start = startIso;
    if (endIso) {
      patch.current_period_end = endIso;
      patch.plan_expires_at = endIso;
    }
    const { error } = await supabaseAdmin.from('reflex_profiles').update(patch).eq('uid', uid);
    if (error) console.error('[sync-subscription] cancel/halt update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  // Active / authenticated / pending — only write dates Razorpay actually confirmed.
  if (!planId || !planConfig || !endIso) {
    const { error } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        razorpay_subscription_id: razorpaySub.id,
        razorpay_plan_id: razorpaySub.plan_id || undefined,
        subscription_status: rzpStatus,
      })
      .eq('uid', uid);
    if (error) console.error('[sync-subscription] metadata update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  const previousStart = existing?.current_period_start ? new Date(existing.current_period_start).getTime() : 0;
  const nextStart = startIso ? new Date(startIso).getTime() : 0;
  const isNewBillingPeriod = !!startIso && previousStart !== nextStart;

  // Reset usage on a new Razorpay billing period, but never on a duplicate webhook
  // and never on a mid-cycle plan upgrade (same period, higher limit is live-looked-up).
  const shouldResetUsage = isNewBillingPeriod && !paymentAlreadyRecorded;

  const patch: Record<string, unknown> = {
    plan: planId,
    plan_started_at: startIso || existing?.current_period_start || new Date().toISOString(),
    plan_expires_at: endIso,
    razorpay_subscription_id: razorpaySub.id,
    razorpay_plan_id: razorpaySub.plan_id || planConfig.razorpayPlanId,
    subscription_status: rzpStatus,
    current_period_start: startIso,
    current_period_end: endIso,
    is_elite: planConfig.isElite,
  };

  if (shouldResetUsage) {
    patch.daily_analysis_count = 0;
    patch.daily_analysis_date = null;
    patch.weekly_planner_count = 0;
    patch.weekly_planner_week = null;
  }

  const { error } = await supabaseAdmin.from('reflex_profiles').update(patch).eq('uid', uid);
  if (error) console.error('[sync-subscription] profile update failed', error);
  return { ok: !error, paymentAlreadyRecorded };
}
