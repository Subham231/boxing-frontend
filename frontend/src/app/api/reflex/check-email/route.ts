import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

// NOTE: this is a convenience pre-check only (lets the signup/login pages
// show a friendlier message before hitting Firebase). It is NOT the
// security boundary — Firebase itself refuses to create a second
// email/password account for an email that's already in use
// (auth/email-already-in-use), and /api/reflex/ensure-profile re-checks
// for a Supabase-side conflict independently.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ exists: false, error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ exists: false, error: 'Invalid email address.' }, { status: 400 });
  }

  const { data } = await supabaseAdmin.from('reflex_profiles').select('uid').ilike('email', email).maybeSingle();
  return NextResponse.json({ exists: !!data });
}
