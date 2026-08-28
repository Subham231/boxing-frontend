import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { HANU_SESSION_COOKIE, hashSessionToken } from '@/lib/server/hanu-auth';

export const runtime = 'nodejs';

// Dark-launch status: nothing calls this route yet — see
// /hanuotp-integration-plan.md.

export async function POST(req: NextRequest) {
  const token = req.cookies.get(HANU_SESSION_COOKIE.name)?.value;

  if (token && supabaseAdmin) {
    try {
      const sessionHash = hashSessionToken(token);
      await supabaseAdmin
        .from('hanu_auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('session_hash', sessionHash);
    } catch {
      // AUTH_HMAC_SECRET missing, etc. — still clear the cookie below
      // regardless, so the browser doesn't keep sending a dead token.
    }
  }

  const response = NextResponse.json({ loggedOut: true });
  response.cookies.set(HANU_SESSION_COOKIE.name, '', { maxAge: 0, path: '/' });
  return response;
}
