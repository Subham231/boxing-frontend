import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { razorpayAuthHeader, razorpayConfigured } from '@/lib/server/razorpay';
import { fetchRazorpaySubscription } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';

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

  // Fetch target profile's subscription from DB
  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from('reflex_profiles')
    .select('razorpay_subscription_id, plan')
    .eq('uid', uid)
    .maybeSingle();

  if (fetchErr || !profile || !profile.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active Razorpay subscription found for user.' }, { status: 404 });
  }

  const subscriptionId = profile.razorpay_subscription_id;

  // If mock mode / no keys
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || subscriptionId.startsWith('sub_mock_')) {
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
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
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

    // Update status in Supabase
    await supabaseAdmin
      .from('reflex_profiles')
      .update({
        subscription_status: 'cancelled',
      })
      .eq('uid', uid);

    return NextResponse.json({ success: true, subscription: cancelData });
  } catch (err) {
    console.error('Subscription cancel endpoint error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
