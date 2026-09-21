import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

/**
 * Does an account exist for this phone number?
 *
 * Checks BOTH stores. A fighter who signed up by phone always has a Firebase
 * Auth user, but their Supabase profile row may be missing (interrupted signup,
 * old migration, manual cleanup). Checking Supabase alone told those people
 * "No account found" and pushed them into a brand-new email signup — exactly
 * the lock-out we must avoid. If Firebase knows the number, they can log in and
 * ensure-profile rebuilds the row on the same uid.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ exists: false, error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ exists: false, error: 'Invalid phone number.' }, { status: 400 });
  }

  const { data } = await supabaseAdmin.from('reflex_profiles').select('uid').eq('phone', phone).maybeSingle();
  if (data) return NextResponse.json({ exists: true });

  try {
    await getAuth(getFirebaseAdminApp()).getUserByPhoneNumber(phone);
    return NextResponse.json({ exists: true });
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
    if (code === 'auth/user-not-found') return NextResponse.json({ exists: false });
    // Firebase Admin unavailable: fall back to the Supabase-only answer above.
    console.error('[check-phone] firebase lookup failed', e);
    return NextResponse.json({ exists: false, degraded: true });
  }
}
