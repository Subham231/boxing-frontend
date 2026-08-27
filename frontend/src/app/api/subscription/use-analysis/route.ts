import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getEntitlement, todayDateStr } from '@/lib/server/entitlements';
import { getLaunchStatus } from '@/lib/launch-status';

export const runtime = 'nodejs';

/** Hash the raw IP so we never store PII. Returns null if IP unknown. */
function hashIP(req: NextRequest): string | null {
  const raw =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-vercel-forwarded-for') ||
    null;
  if (!raw || raw === 'unknown') return null;
  return createHash('sha256').update(raw).digest('hex');
}

// Call this immediately before starting an AI Video Analysis session.
// It is the enforcement point — the client's own belief about whether it
// has quota left is irrelevant, this route is the only thing that can
// actually grant a session.
export async function POST(req: NextRequest) {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ allowed: false, reason: 'coming_soon', message: 'AI Video Analysis opens at launch.' }, { status: 403 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
  }

  // Check for auth token
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');

  // For anonymous users (no auth), apply DB-backed session + IP abuse protection
  if (!idToken) {
    const sessionId = req.headers.get('x-anon-session') || 'none';
    const ipHash = hashIP(req);

    const { data: allowed, error } = await supabaseAdmin.rpc('try_consume_anon_usage', {
      p_session_id: sessionId,
      p_ip_hash: ipHash,
      p_feature: 'boxing_analysis',
      p_limit_per_session: 1,
      p_limit_per_ip_day: 3,
    });

    if (error) {
      console.error('[use-analysis] anon check error:', error);
      // If the RPC doesn't exist yet (schema not applied), fall through permissively
      // with a log rather than blocking all anonymous users.
      console.warn('[use-analysis] anon_usage RPC unavailable — run reflex-schema-v17.sql');
      return NextResponse.json({ allowed: true, anonymous: true });
    }

    if (!allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'anon_limit_reached',
          message: 'Free analysis limit reached. Sign up to continue.',
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      allowed: true,
      anonymous: true,
      message: 'Anonymous access granted. Sign up to unlock unlimited analysis.',
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
