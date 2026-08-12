import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const DEV_MOCK_ALLOWED = process.env.NEXT_PUBLIC_ENABLE_DEV_SKIP === 'true';

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

  const plan = PLANS[planId as PlanId];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  if (isMock && !DEV_MOCK_ALLOWED) {
    return NextResponse.json({ error: 'Mock payments are disabled on this deployment.' }, { status: 403 });
  }

  let paymentIdForLedger: string;

  if (isMock) {
    paymentIdForLedger = `mock_${uid}_${Date.now()}`;
  } else {
    if (!razorpay_payment_id || !razorpay_signature || (!razorpay_subscription_id && !razorpay_order_id)) {
      return NextResponse.json({ error: 'Missing payment signature components' }, { status: 400 });
    }
    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay secret key is not configured on the server' }, { status: 500 });
    }

    // Subscription signature format: razorpay_payment_id + '|' + razorpay_subscription_id
    // Order signature format: razorpay_order_id + '|' + razorpay_payment_id
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
    paymentIdForLedger = razorpay_payment_id;
  }

  // Idempotency: razorpay_payment_id is unique
  const { error: insertError } = await supabaseAdmin.from('subscription_payments').insert({
    uid,
    razorpay_payment_id: paymentIdForLedger,
    razorpay_subscription_id: razorpay_subscription_id || null,
    plan: plan.id,
    amount_paise: plan.priceInPaise,
    status: 'verified',
    event_type: 'subscription.charged',
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'This payment has already been processed.' }, { status: 409 });
    }
    console.error('Payment ledger insert error:', insertError);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
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
      razorpay_subscription_id: razorpay_subscription_id || null,
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
    .select('*')
    .single();

  if (error) {
    console.error('Supabase subscription update error:', error);
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}
