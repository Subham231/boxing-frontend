import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { HANU_SESSION_COOKIE, hashSessionToken } from '@/lib/server/hanu-auth';

export const runtime = 'nodejs';

// Dark-launch status: nothing calls this route yet — see
// /hanuotp-integration-plan.md.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ authenticated: false, error: 'Server not configured.' }, { status: 500 });
  }

  const token = req.cookies.get(HANU_SESSION_COOKIE.name)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  let sessionHash: string;
  try {
    sessionHash = hashSessionToken(token);
  } catch {
    return NextResponse.json({ authenticated: false, error: 'Server not configured.' }, { status: 500 });
  }

  const { data: session } = await supabaseAdmin
    .from('hanu_auth_sessions')
    .select('uid, expires_at, revoked_at')
    .eq('session_hash', sessionHash)
    .maybeSingle();

  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, uid: session.uid });
}
