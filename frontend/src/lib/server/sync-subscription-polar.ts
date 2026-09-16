// SERVER-ONLY. Single writer for Polar → reflex_profiles. Webhook and
// checkout-return polling both call this so they cannot drift — same
// pattern as syncSubscriptionFromRazorpay in sync-subscription.ts, and
// intentionally writes into the SAME plan / subscription_status /
// current_period_start / current_period_end columns Razorpay uses, so
// lib/server/entitlements.ts stays completely provider-agnostic.
import { supabaseAdmin } from './supabase-admin';
import { PLANS, PlanId, planIdFromPolarProductId } from './entitlements';

// Polar's own subscription.status values. "active" and "trialing" grant
// access; "canceled" (Polar's spelling) keeps access until current_period_end
// naturally passes (mirrors Razorpay's cancelled/halted handling); anything
// else is treated as not-yet-paid / ended.
const PAID_GRANT_STATUSES = new Set(['active', 'trialing']);
const PERIOD_KEEP_STATUSES = new Set(['canceled', 'past_due', 'unpaid']);

export interface PolarSubscriptionLike {
  id: string;
  status?: string | null;
  productId?: string | null;
  product_id?: string | null;
  currentPeriodStart?: string | Date | null;
  current_period_start?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  current_period_end?: string | Date | null;
  customerId?: string | null;
  customer_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PolarPaymentLike {
  id: string; // Polar order id or payment id
  amount?: number | null;
  status?: string | null;
}

function toIso(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractPlanId(sub: PolarSubscriptionLike): PlanId | null {
  const productId = sub.productId || sub.product_id || null;
  const fromProduct = planIdFromPolarProductId(productId);
  if (fromProduct) return fromProduct;
  const metaPlan = (sub.metadata?.plan_id as string | undefined) || null;
  if (metaPlan && PLANS[metaPlan as PlanId]) return metaPlan as PlanId;
  return null;
}

/**
 * Prefix every Polar webhook event id before handing it to
 * markWebhookEventProcessed() in sync-subscription.ts, so a Polar event id
 * can never collide with a Razorpay event id in the shared
 * processed_webhook_events table (see reflex-schema-v23.sql note 4 — the
 * table's primary key is untouched, this is the additive-safe way to keep
 * "razorpay + event_123" and "polar + event_123" distinct).
 */
export function polarEventKey(eventId: string): string {
  return `polar:${eventId}`;
}

export async function findUidForPolarSubscription(opts: {
  externalCustomerId?: string | null;
  metadataUid?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  if (opts.metadataUid) return opts.metadataUid;
  if (opts.externalCustomerId) return opts.externalCustomerId; // external_customer_id IS the Firebase UID (see createPolarCheckout)
  if (!supabaseAdmin) return null;

  if (opts.subscriptionId) {
    const { data } = await supabaseAdmin
      .from('reflex_profiles')
      .select('uid')
      .eq('polar_subscription_id', opts.subscriptionId)
      .maybeSingle();
    if (data?.uid) return data.uid;
  }
  if (opts.customerId) {
    const { data } = await supabaseAdmin
      .from('reflex_profiles')
      .select('uid')
      .eq('polar_customer_id', opts.customerId)
      .maybeSingle();
    if (data?.uid) return data.uid;
  }
  return null;
}

export async function syncSubscriptionFromPolar(opts: {
  uid: string;
  polarSub: PolarSubscriptionLike;
  payment?: PolarPaymentLike | null;
  country?: string | null;
  currency?: string | null;
  eventType?: string;
}): Promise<{ ok: boolean; paymentAlreadyRecorded: boolean }> {
  if (!supabaseAdmin) return { ok: false, paymentAlreadyRecorded: false };

  const { uid, polarSub, payment, eventType } = opts;
  const status = (polarSub.status || '').toLowerCase();
  const planId = extractPlanId(polarSub);
  const planConfig = planId ? PLANS[planId] : null;
  const customerId = polarSub.customerId || polarSub.customer_id || null;

  const startIso = toIso(polarSub.currentPeriodStart || polarSub.current_period_start);
  const endIso = toIso(polarSub.currentPeriodEnd || polarSub.current_period_end);

  const { data: existing } = await supabaseAdmin
    .from('reflex_profiles')
    .select('plan, current_period_start, current_period_end, daily_analysis_count, daily_analysis_date, weekly_planner_count, weekly_planner_week')
    .eq('uid', uid)
    .maybeSingle();

  let paymentAlreadyRecorded = false;
  if (payment?.id) {
    const { error: insertError } = await supabaseAdmin.from('subscription_payments').insert({
      uid,
      polar_payment_id: payment.id,
      polar_subscription_id: polarSub.id,
      provider: 'polar',
      plan: planId || existing?.plan || 'monthly',
      amount_paise: payment.amount || Math.round((planConfig?.priceUsd || 0) * 100),
      status: payment.status === 'paid' || payment.status === 'succeeded' ? 'captured' : 'verified',
      event_type: eventType || 'reconcile',
      country: opts.country || null,
      currency: opts.currency || null,
    });
    if (insertError?.code === '23505') {
      paymentAlreadyRecorded = true;
    } else if (insertError) {
      console.error('[sync-subscription-polar] payment ledger insert failed', insertError);
    }
  }

  const baseMeta: Record<string, unknown> = {
    payment_provider: 'polar',
    polar_subscription_id: polarSub.id,
    polar_customer_id: customerId || undefined,
    polar_product_id: polarSub.productId || polarSub.product_id || undefined,
    subscription_status: status || 'expired',
  };
  if (opts.country) baseMeta.country_code = opts.country;
  if (opts.currency) baseMeta.currency_code = opts.currency;

  // Failed / ended: never extend dates, just record status/metadata.
  if (!PAID_GRANT_STATUSES.has(status) && !PERIOD_KEEP_STATUSES.has(status)) {
    const { error } = await supabaseAdmin.from('reflex_profiles').update(baseMeta).eq('uid', uid);
    if (error) console.error('[sync-subscription-polar] status-only update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  // Cancelled-but-not-yet-expired / past_due: keep the remaining paid period.
  if (PERIOD_KEEP_STATUSES.has(status)) {
    const patch: Record<string, unknown> = { ...baseMeta };
    if (planId) patch.plan = planId;
    if (startIso) patch.current_period_start = startIso;
    if (endIso) {
      patch.current_period_end = endIso;
      patch.plan_expires_at = endIso;
    }
    const { error } = await supabaseAdmin.from('reflex_profiles').update(patch).eq('uid', uid);
    if (error) console.error('[sync-subscription-polar] cancel/past_due update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  // Active / trialing.
  if (!planId || !planConfig || !endIso) {
    const { error } = await supabaseAdmin.from('reflex_profiles').update(baseMeta).eq('uid', uid);
    if (error) console.error('[sync-subscription-polar] metadata-only update failed', error);
    return { ok: !error, paymentAlreadyRecorded };
  }

  const previousStart = existing?.current_period_start ? new Date(existing.current_period_start).getTime() : 0;
  const nextStart = startIso ? new Date(startIso).getTime() : 0;
  const isNewBillingPeriod = !!startIso && previousStart !== nextStart;
  const shouldResetUsage = isNewBillingPeriod && !paymentAlreadyRecorded;

  const patch: Record<string, unknown> = {
    ...baseMeta,
    plan: planId,
    plan_started_at: startIso || existing?.current_period_start || new Date().toISOString(),
    plan_expires_at: endIso,
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
  if (error) console.error('[sync-subscription-polar] profile update failed', error);
  return { ok: !error, paymentAlreadyRecorded };
}
