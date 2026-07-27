import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// ⚠️ TEMPORARY / TESTING ONLY ⚠️
// This route exists solely so the subscription gate doesn't block every
// tester before real Razorpay payment processing is wired up. It grants the
// calling (already-authenticated) account a subscription window with no
// payment involved. DELETE THIS ROUTE — and the "Skip (Testing Only)"
// button that calls it on /subscription — once real checkout is live.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
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

  // 30 days — matches the real Basic Monthly plan's duration, so testing
  // behaves the same way a real subscription would (including it actually
  // expiring, so the gate can be tested too).
  const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ subscription_until: until })
    .eq('uid', decoded.uid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ granted: true, until });
}
