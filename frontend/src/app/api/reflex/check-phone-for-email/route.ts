import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

/**
 * Given an email address, returns { isPhoneOnly: true } if the Firebase user
 * for that email exists but has no password provider (i.e. they originally
 * signed up with a phone number and their email was linked later, or the
 * email exists only because of OAuth/phone).
 *
 * This lets the login page and the onboarding flow detect when someone is
 * trying to log in with an email+password that doesn't exist yet, but their
 * phone-only account IS there — so we can offer them the link-email flow
 * instead of a dead-end "wrong password" error.
 *
 * No auth token required — we only return a boolean, not any user data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ isPhoneOnly: false, error: 'Invalid email.' }, { status: 400 });
    }

    const auth = getAuth(getFirebaseAdminApp());
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (e: any) {
      // auth/user-not-found — no account at all for this email
      if (e?.code === 'auth/user-not-found') {
        return NextResponse.json({ isPhoneOnly: false });
      }
      throw e;
    }

    const providers = user.providerData.map((p) => p.providerId);
    const hasPhone = providers.includes('phone') || !!user.phoneNumber;
    const hasPassword = providers.includes('password');

    // Phone-only: has phone credential, no password credential
    return NextResponse.json({ isPhoneOnly: hasPhone && !hasPassword });
  } catch (e) {
    console.error('[check-phone-for-email] error', e);
    // On any admin SDK error, fail open (don't block login)
    return NextResponse.json({ isPhoneOnly: false, degraded: true });
  }
}
