import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

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

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
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
      console.error('Razorpay subscription creation failed:', errBody);
      return NextResponse.json(
        { error: errBody.error?.description || 'Razorpay subscription creation failed' },
        { status: 500 },
      );
    }

    const subscription = await response.json();
    return NextResponse.json({ subscription, planId, keyId: RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create Subscription Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
