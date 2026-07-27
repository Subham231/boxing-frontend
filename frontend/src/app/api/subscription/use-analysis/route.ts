import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement, todayDateStr } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

// Call this immediately before starting an AI Video Analysis session.
// It is the enforcement point — the client's own belief about whether it
// has quota left is irrelevant, this route is the only thing that can
// actually grant a session.
export async function POST(req: NextRequest) {
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
      { allowed: false, reason: 'no_subscription', message: 'An active subscription is required for AI Video Analysis.' },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc('try_consume_daily_analysis', {
    p_uid: uid,
    p_limit: entitlement.dailyAnalysisLimit,
    p_today: todayDateStr(),
  });

  if (error) {
    console.error('try_consume_daily_analysis error:', error);
    return NextResponse.json({ error: 'Failed to check usage limit.' }, { status: 500 });
  }

  if (!data.allowed) {
    return NextResponse.json(
      { allowed: false, reason: 'daily_limit_reached', used: data.used, limit: data.limit },
      { status: 403 }
    );
  }

  return NextResponse.json({ allowed: true, used: data.used, limit: data.limit });
}
