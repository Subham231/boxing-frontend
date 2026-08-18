import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';
import { fetchRazorpayPayment, fetchRazorpaySubscription, razorpayConfigured } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';
import { isDevSkipAllowed } from '@/lib/server/env';

export const runtime = 'nodejs';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
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
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_order_id, razorpay_signature, planId, isMock } = body;

  if (isMock && !DEV_MOCK_ALLOWED) {
    return NextResponse.json({ error: 'Mock payments are disabled on this deployment.' }, { status: 403 });
  }

  if (isMock) {
    const plan = PLANS[planId as PlanId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);
    const { data, error } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        plan: plan.id,
        plan_started_at: now.toISOString(),
        plan_expires_at: expiryDate.toISOString(),
        razorpay_subscription_id: `sub_mock_${uid.slice(0, 8)}`,
        razorpay_plan_id: plan.razorpayPlanId,
        subscription_status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: expiryDate.toISOString(),
        is_elite: plan.isElite,
        daily_analysis_count: 0,
        daily_analysis_date: null,
        weekly_planner_count: 0,
        weekly_planner_week: null,
      })
      .eq('uid', uid)
      .select('uid, plan, plan_expires_at, subscription_status')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to activate mock subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true, profile: data });
  }

  if (!razorpay_payment_id || !razorpay_signature || (!razorpay_subscription_id && !razorpay_order_id)) {
    return NextResponse.json({ error: 'Missing payment signature components' }, { status: 400 });
  }
  if (!RAZORPAY_KEY_SECRET || !razorpayConfigured()) {
    return NextResponse.json({ error: 'Razorpay secret key is not configured on the server' }, { status: 500 });
  }

  let generatedSignature = '';
  if (razorpay_subscription_id) {
    generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');
  } else if (razorpay_order_id) {
    generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
  }

  if (generatedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature — verification failed' }, { status: 400 });
  }

  const payment = await fetchRazorpayPayment(razorpay_payment_id);
  if (!payment?.id) {
    return NextResponse.json({ error: 'Payment could not be verified with Razorpay.' }, { status: 400 });
  }

  const subId = razorpay_subscription_id || payment.subscription_id;
  if (!subId) {
    return NextResponse.json({ error: 'No Razorpay subscription is attached to this payment.' }, { status: 400 });
  }

  const live = await fetchRazorpaySubscription(subId);
  if (!live?.id) {
    return NextResponse.json({ error: 'Subscription could not be verified with Razorpay.' }, { status: 400 });
  }

  if (live.notes?.uid && live.notes.uid !== uid) {
    return NextResponse.json({ error: 'This payment does not belong to the signed-in user.' }, { status: 403 });
  }

  const result = await syncSubscriptionFromRazorpay({
    uid,
    razorpaySub: live,
    payment,
    eventType: 'checkout.verified',
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
  }

  const { data } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid, plan, plan_expires_at, subscription_status, current_period_end')
    .eq('uid', uid)
    .single();

  return NextResponse.json({ success: true, profile: data });
}
