import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

// Call this if an AI Video Analysis session or API processing fails, to safely
// decrement the usage counter so the user isn't penalized for system errors.
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

  const { data, error } = await supabaseAdmin.rpc('refund_daily_analysis', { p_uid: uid });
  if (error) {
    console.error('refund_daily_analysis error:', error);
    return NextResponse.json({ error: 'Failed to refund usage limit.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...data });
}
