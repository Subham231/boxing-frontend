import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, PlanId } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

// ============================================================================
// DEV/TEST ONLY. Delete this whole route (and the "Skip (Dev)" button in
// the subscription page) before shipping to production.
//
// Gated by NEXT_PUBLIC_ENABLE_DEV_SKIP — must be explicitly set to 'true'
// in the deployment's env vars. Any deployment that doesn't set it (i.e.
// production, unless someone deliberately misconfigures it) gets a 403
// here no matter what the client sends.
// ============================================================================
const DEV_MOCK_ALLOWED = process.env.NEXT_PUBLIC_ENABLE_DEV_SKIP === 'true';

export async function POST(req: NextRequest) {
  if (!DEV_MOCK_ALLOWED) {
    return NextResponse.json({ error: 'Dev skip is disabled on this deployment.' }, { status: 403 });
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

  const body = await req.json().catch(() => ({}));
  const planId = (body.planId as PlanId) || 'yearly';
  const plan = PLANS[planId] || PLANS.yearly;

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 1); // dev grants are always short-lived (1 day)

  const { data, error } = await supabaseAdmin
    .from('reflex_profiles')
    .update({
      plan: plan.id,
      plan_started_at: new Date().toISOString(),
      plan_expires_at: expiryDate.toISOString(),
      is_elite: plan.isElite,
      daily_analysis_count: 0,
      daily_analysis_date: null,
      weekly_planner_count: 0,
      weekly_planner_week: null,
    })
    .eq('uid', decoded.uid)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to grant dev plan' }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data, devMode: true });
}
