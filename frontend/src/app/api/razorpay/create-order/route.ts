import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const { planId, uid } = await req.json();

    if (!planId || !uid) {
      return NextResponse.json({ error: 'Missing planId or uid' }, { status: 400 });
    }

    // Define pricing in INR (paise)
    // Pro Monthly = ₹829 (82900 paise), Pro Yearly = ₹6500 (650000 paise)
    let amount = 82900;
    if (planId === 'yearly') {
      amount = 650000;
    } else if (planId === 'free') {
      return NextResponse.json({ error: 'Free plan does not require checkout' }, { status: 400 });
    }

    // Fallback/Mock Mode if API keys are not supplied
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay keys not configured. Falling back to Mock Order Creation.');
      const mockOrder = {
        id: `mock_order_${Math.random().toString(36).substring(2, 11)}`,
        entity: 'order',
        amount: amount,
        amount_paid: 0,
        amount_due: amount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };
      return NextResponse.json({ order: mockOrder });
    }

    // Create order using Razorpay REST API
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
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errBody.error?.description || 'Razorpay order creation failed' }, { status: 500 });
    }

    const order = await response.json();
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
