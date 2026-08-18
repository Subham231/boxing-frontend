import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';
import { publicRazorpayKeyId, razorpayAuthHeader, razorpayConfigured } from '@/lib/server/razorpay';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}));
  const planId = body.planId as PlanId;
  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  const uid = decoded.uid;

  if (!razorpayConfigured()) {
    console.warn('Razorpay keys not configured. Falling back to Mock Subscription Creation.');
    const mockSub = {
      id: `sub_mock_${Math.random().toString(36).substring(2, 11)}`,
      entity: 'subscription',
      plan_id: plan.razorpayPlanId,
      status: 'created',
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor(Date.now() / 1000) + plan.durationDays * 86400,
      notes: { uid, planId },
      isMock: true,
    };
    return NextResponse.json({ subscription: mockSub, planId, keyId: 'rzp_test_mock' });
  }

  try {
    if (!plan.razorpayPlanId || plan.razorpayPlanId.endsWith('_default')) {
      return NextResponse.json(
        { error: `Razorpay Plan ID for '${plan.name}' is not configured on the server. Please set ${planId.toUpperCase()} env var.` },
        { status: 500 },
      );
    }

    const totalCount = planId === 'yearly' ? 10 : planId === 'three_month' ? 20 : 60;
    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        plan_id: plan.razorpayPlanId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          uid,
          planId,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.warn('Razorpay subscription API rejected plan_id, falling back to direct order creation:', errBody);

      // Fallback: Create direct Razorpay Order so checkout NEVER breaks even if Subscriptions API rejects plan ID
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: plan.priceInPaise,
          currency: 'INR',
          receipt: `rcpt_${uid.substring(0, 8)}_${Date.now()}`,
          notes: { uid, planId },
        }),
      });

      if (!orderRes.ok) {
        const orderErr = await orderRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: orderErr.error?.description || errBody.error?.description || 'Razorpay payment creation failed' },
          { status: 500 },
        );
      }

      const order = await orderRes.json();
      return NextResponse.json({ order, planId, keyId: RAZORPAY_KEY_ID, isDirectOrder: true });
    }

    const subscription = await response.json();
    return NextResponse.json({ subscription, planId, keyId: RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create Subscription Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
