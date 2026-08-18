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
    return NextResponse.json(
      { error: 'Payment system is not configured. Cannot create a subscription.' },
      { status: 500 },
    );
  }

  try {
    if (!plan.razorpayPlanId || plan.razorpayPlanId.endsWith('_default')) {
      return NextResponse.json(
        { error: `Razorpay Plan ID for '${plan.name}' is not configured on the server.` },
        { status: 500 },
      );
    }

    const totalCount = planId === 'yearly' ? 10 : planId === 'three_month' ? 20 : 60;
    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuthHeader(),
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
      console.error('Razorpay subscription API rejected plan_id:', errBody);
      return NextResponse.json(
        { error: errBody.error?.description || 'Could not create Razorpay subscription. Check live plan IDs.' },
        { status: 500 },
      );
    }

    const subscription = await response.json();
    if (supabaseAdmin && subscription?.id) {
      await supabaseAdmin
        .from('reflex_profiles')
        .update({
          razorpay_subscription_id: subscription.id,
          razorpay_plan_id: plan.razorpayPlanId,
        })
        .eq('uid', uid);
    }
    return NextResponse.json({ subscription, planId, keyId: publicRazorpayKeyId() });
  } catch (error) {
    console.error('Create Subscription Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
