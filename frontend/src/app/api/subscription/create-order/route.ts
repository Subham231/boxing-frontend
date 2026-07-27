import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
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

  // The price is looked up server-side from PLANS — the client sends only
  // a plan ID, never an amount. A tampered/forged amount in the request
  // body is simply ignored.
  const amount = plan.priceInPaise;
  const uid = decoded.uid;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.warn('Razorpay keys not configured. Falling back to Mock Order Creation.');
    const mockOrder = {
      id: `mock_order_${Math.random().toString(36).substring(2, 11)}`,
      entity: 'order',
      amount,
      amount_paid: 0,
      amount_due: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      isMock: true,
    };
    return NextResponse.json({ order: mockOrder, planId });
  }

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `receipt_${uid.substring(0, 10)}_${Date.now()}`,
        notes: { uid, planId },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errBody.error?.description || 'Razorpay order creation failed' }, { status: 500 });
    }

    const order = await response.json();
    return NextResponse.json({ order, planId });
  } catch (error) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
