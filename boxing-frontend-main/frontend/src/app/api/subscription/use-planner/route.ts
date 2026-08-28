import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement, currentIsoWeek } from '@/lib/server/entitlements';
import { getLaunchStatus } from '@/lib/launch-status';

export const runtime = 'nodejs';

// Call this immediately before generating a new training plan. Same
// enforcement pattern as use-analysis, on the weekly Planner limit.
export async function POST(req: NextRequest) {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ allowed: false, reason: 'coming_soon', message: 'Planner opens at launch.' }, { status: 403 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
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

  const entitlement = await getEntitlement(uid);
  if (!entitlement.active) {
    return NextResponse.json(
      { allowed: false, reason: 'no_subscription', message: 'An active subscription is required for Planner generation.' },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc('try_consume_weekly_planner', {
    p_uid: uid,
    p_limit: entitlement.weeklyPlannerLimit,
    p_week: currentIsoWeek(),
  });

  if (error) {
    console.error('try_consume_weekly_planner error:', error);
    return NextResponse.json({ error: 'Failed to check usage limit.' }, { status: 500 });
  }

  if (!data.allowed) {
    return NextResponse.json(
      { allowed: false, reason: 'weekly_limit_reached', used: data.used, limit: data.limit },
      { status: 403 }
    );
  }

  return NextResponse.json({ allowed: true, used: data.used, limit: data.limit });
}
