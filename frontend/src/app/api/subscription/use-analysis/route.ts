import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement, todayDateStr } from '@/lib/server/entitlements';
import { getClientIP, rateLimitMiddleware, BOXING_ANALYSIS_LIMITER } from '@/lib/server/ip-rate-limit';

export const runtime = 'nodejs';

// Call this immediately before starting an AI Video Analysis session.
// It is the enforcement point — the client's own belief about whether it
// has quota left is irrelevant, this route is the only thing that can
// actually grant a session.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
  }

  // Check for auth token
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');

  // For anonymous users (no auth), apply IP-based rate limiting
  if (!idToken) {
    const rateLimitResponse = rateLimitMiddleware(req, BOXING_ANALYSIS_LIMITER);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    // Anonymous users get one free analysis per day
    return NextResponse.json({
      allowed: true,
      anonymous: true,
      message: 'Anonymous access granted. Sign up for unlimited access.'
    });
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
