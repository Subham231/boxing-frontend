import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { fetchRazorpaySubscription, razorpayAuthHeader, razorpayConfigured } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';
import { cancelPolarSubscription, getPolarSubscription, polarConfigured } from '@/lib/server/polar';
import { syncSubscriptionFromPolar } from '@/lib/server/sync-subscription-polar';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service not configured.' }, { status: 500 });
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

  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from('reflex_profiles')
    .select('razorpay_subscription_id, polar_subscription_id, payment_provider, plan')
    .eq('uid', uid)
    .maybeSingle();

  if (fetchErr || !profile || (!profile.razorpay_subscription_id && !profile.polar_subscription_id)) {
    return NextResponse.json({ error: 'No active subscription found for user.' }, { status: 404 });
  }

  // Provider-aware dispatch — the Razorpay branch below is byte-for-byte
  // the previous implementation, untouched. Only the Polar branch is new.
  const isPolar = profile.payment_provider === 'polar' && !!profile.polar_subscription_id;

  if (isPolar) {
    if (!polarConfigured()) {
      await supabaseAdmin.from('reflex_profiles').update({ subscription_status: 'cancelled' }).eq('uid', uid);
      return NextResponse.json({ success: true, message: 'Subscription cancelled (Mock)' });
    }
    try {
      await cancelPolarSubscription(profile.polar_subscription_id as string);
      const live = await getPolarSubscription(profile.polar_subscription_id as string);
      if (live?.id) {
        await syncSubscriptionFromPolar({ uid, polarSub: live as any, eventType: 'subscription.canceled' });
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error('Polar cancellation error:', err);
      return NextResponse.json({ error: 'Failed to cancel subscription with Polar' }, { status: 500 });
    }
  }

  const subscriptionId = profile.razorpay_subscription_id as string;

  // If mock mode / no keys
  if (!razorpayConfigured() || subscriptionId.startsWith('sub_mock_')) {
    await supabaseAdmin
      .from('reflex_profiles')
      .update({ subscription_status: 'cancelled' })
      .eq('uid', uid);
    return NextResponse.json({ success: true, message: 'Subscription cancelled (Mock)' });
  }

  try {
    // Request cancellation at period end from Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuthHeader(),
      },
      body: JSON.stringify({
        cancel_at_cycle_end: 1,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Razorpay cancellation error:', errBody);
      return NextResponse.json({ error: errBody.error?.description || 'Failed to cancel subscription with Razorpay' }, { status: 500 });
    }

    const cancelData = await response.json();
    const live = (await fetchRazorpaySubscription(subscriptionId)) || cancelData;
    await syncSubscriptionFromRazorpay({ uid, razorpaySub: live, eventType: 'subscription.cancelled' });

    return NextResponse.json({ success: true, subscription: cancelData });
  } catch (err) {
    console.error('Subscription cancel endpoint error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
