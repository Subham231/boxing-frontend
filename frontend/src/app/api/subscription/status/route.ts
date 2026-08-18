import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement } from '@/lib/server/entitlements';
import { fetchRazorpaySubscription } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';

export const runtime = 'nodejs';

const LIVE_CHECK_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours around period end

async function maybeLiveSync(uid: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data: row } = await supabaseAdmin
    .from('reflex_profiles')
    .select('razorpay_subscription_id, subscription_status, current_period_end')
    .eq('uid', uid)
    .maybeSingle();

  const subId = row?.razorpay_subscription_id as string | undefined;
  if (!subId || subId.startsWith('sub_mock_')) return;

  const status = (row.subscription_status || '').toLowerCase();
  const endMs = row.current_period_end ? new Date(row.current_period_end).getTime() : 0;
  const now = Date.now();
  const nearOrPastEnd = !endMs || Math.abs(endMs - now) <= LIVE_CHECK_WINDOW_MS || endMs <= now;
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
  return NextResponse.json(entitlement);
}
