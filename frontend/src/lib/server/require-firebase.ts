import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';

export async function requireFirebaseUid(req: NextRequest): Promise<
  { uid: string; token: any } | { error: NextResponse }
> {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    return { error: NextResponse.json({ error: 'Missing auth token.' }, { status: 401 }) };
  }
  try {
    const token = await verifyFirebaseIdToken(idToken);
    return { uid: token.uid, token };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 }) };
  }
}

/**
 * Same as requireFirebaseUid, but additionally rejects an email/password
 * account whose email has not been verified. This is the ONLY server-side
 * source of truth for "is this fighter verified" — never trust a
 * client-supplied emailVerified flag, only the decoded ID token, which
 * Firebase itself re-derives on every sign-in / token refresh.
 *
 * Phone-auth accounts (sign_in_provider === 'phone') are grandfathered
 * through untouched — phone verification already happened via the SMS
 * code, so there is nothing new to require here. This only blocks a
 * password account that skipped/ignored the verification email.
 */
export async function requireVerifiedFirebaseUid(req: NextRequest): Promise<
  { uid: string; token: any } | { error: NextResponse }
> {
  const result = await requireFirebaseUid(req);
  if ('error' in result) return result;

  const { token } = result;
  const provider = token.firebase?.sign_in_provider;
  const isPasswordAccount = provider === 'password';
  const hasVerifiedEmail = token.email_verified === true;

  if (isPasswordAccount && !hasVerifiedEmail) {
    return {
      error: NextResponse.json(
        { error: 'Please verify your email before continuing.', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 },
      ),
    };
  }

  return result;
}
