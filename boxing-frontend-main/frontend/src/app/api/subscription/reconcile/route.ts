import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { fetchRazorpaySubscription } from '@/lib/server/razorpay';
import { syncSubscriptionFromRazorpay } from '@/lib/server/sync-subscription';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return headerSecret === secret || bearer === secret;
}

async function reconcile() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid, razorpay_subscription_id, plan, subscription_status, current_period_end')
    .not('razorpay_subscription_id', 'is', null);

  if (error) {
    console.error('[reconcile] query failed', error);
    return NextResponse.json({ error: 'Failed to load subscriptions.' }, { status: 500 });
  }

  let checked = 0;
  let synced = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const subId = row.razorpay_subscription_id as string;
    if (!subId || subId.startsWith('sub_mock_')) continue;
    checked += 1;
    const live = await fetchRazorpaySubscription(subId);
    if (!live?.id) {
      failed += 1;
      continue;
    }
    const result = await syncSubscriptionFromRazorpay({
      uid: row.uid,
      razorpaySub: live,
      eventType: 'reconcile',
    });
    if (result.ok) synced += 1;
    else failed += 1;
  }

  return NextResponse.json({ checked, synced, failed });
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return reconcile();
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return reconcile();
}
