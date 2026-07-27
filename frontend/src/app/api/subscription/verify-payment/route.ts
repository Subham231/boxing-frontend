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
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, isMock } = body;

  const plan = PLANS[planId as PlanId];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  // Mock payments only ever work if the deployment explicitly opted into
  // dev/test mode via env var — this can't be flipped on by anything the
  // client sends, so it's not a bypass path in production.
  if (isMock && !DEV_MOCK_ALLOWED) {
    return NextResponse.json({ error: 'Mock payments are disabled on this deployment.' }, { status: 403 });
  }

  let paymentIdForLedger: string;

  if (isMock) {
    paymentIdForLedger = `mock_${uid}_${Date.now()}`;
  } else {
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment signature components' }, { status: 400 });
    }
    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay secret key is not configured on the server' }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature — verification failed' }, { status: 400 });
    }
    paymentIdForLedger = razorpay_payment_id;
  }

  // Idempotency: razorpay_payment_id has a UNIQUE constraint in Postgres.
  // If this payment was already recorded (double-submit, retried webhook,
  // replayed request), the insert fails and we simply don't activate
  // anything a second time.
  const { error: insertError } = await supabaseAdmin.from('subscription_payments').insert({
    uid,
    razorpay_payment_id: paymentIdForLedger,
    razorpay_order_id: razorpay_order_id || null,
    plan: plan.id,
    amount_paise: plan.priceInPaise,
    status: 'verified',
  });

  if (insertError) {
    if (insertError.code === '23505') {
      // Unique violation — this exact payment was already processed.
      return NextResponse.json({ error: 'This payment has already been processed.' }, { status: 409 });
    }
    console.error('Payment ledger insert error:', insertError);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }

  // Activate the plan. Expiry is recalculated from the purchase moment,
  // not extended additively on top of a stale value — an upgrade/renewal
  // always resets from "now".
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  const { data, error } = await supabaseAdmin
    .from('reflex_profiles')
    .update({
      plan: plan.id,
      plan_started_at: new Date().toISOString(),
      plan_expires_at: expiryDate.toISOString(),
      is_elite: plan.isElite,
      // A fresh purchase resets usage counters so a renewal/upgrade starts
      // the new billing period with a clean allowance.
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
