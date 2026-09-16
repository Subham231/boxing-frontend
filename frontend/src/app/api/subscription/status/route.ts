import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement } from '@/lib/server/entitlements';
import { fetchRazorpaySubscription } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';
import { getPolarSubscription } from '@/lib/server/polar';
import { syncSubscriptionFromPolar } from '@/lib/server/sync-subscription-polar';

export const runtime = 'nodejs';

const LIVE_CHECK_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours around period end

async function maybeLiveSync(uid: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data: row } = await supabaseAdmin
    .from('reflex_profiles')
    .select('razorpay_subscription_id, polar_subscription_id, payment_provider, subscription_status, current_period_end')
    .eq('uid', uid)
    .maybeSingle();

  const status = (row?.subscription_status || '').toLowerCase();
  const endMs = row?.current_period_end ? new Date(row.current_period_end).getTime() : 0;
  const now = Date.now();
  const nearOrPastEnd = !endMs || Math.abs(endMs - now) <= LIVE_CHECK_WINDOW_MS || endMs <= now;

  if (row?.payment_provider === 'polar' && row.polar_subscription_id) {
    const unsettled = ['incomplete', 'trialing', 'past_due'].includes(status);
    if (!nearOrPastEnd && !unsettled) return;
    const live = await getPolarSubscription(row.polar_subscription_id as string);
    if (!live?.id) return;
    await syncSubscriptionFromPolar({ uid, polarSub: live as any, eventType: 'status.live_check' });
    return;
  }

  const subId = row?.razorpay_subscription_id as string | undefined;
  if (!subId || subId.startsWith('sub_mock_')) return;

  const unsettled = ['created', 'authenticated', 'pending', 'halted'].includes(status);
  if (!nearOrPastEnd && !unsettled) return;

  const live = await fetchRazorpaySubscription(subId);
  if (!live?.id) return;
  await syncSubscriptionFromRazorpay({ uid, razorpaySub: live, eventType: 'status.live_check' });
}

export async function GET(req: NextRequest) {
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

  try {
    await maybeLiveSync(decoded.uid);
  } catch (err) {
    console.error('[status] live Razorpay sync failed', err);
  }

  const entitlement = await getEntitlement(decoded.uid);

  let sessionValid = true;
  const clientSession = req.headers.get('x-session-token');
  if (supabaseAdmin && clientSession) {
    const { data: row } = await supabaseAdmin
      .from('reflex_profiles')
      .select('current_session_token')
      .eq('uid', decoded.uid)
      .maybeSingle();
    if (row?.current_session_token && row.current_session_token !== clientSession) {
      sessionValid = false;
    }
  }

  return NextResponse.json({ ...entitlement, sessionValid });
}
