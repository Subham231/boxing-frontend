import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { hashEmail, hashEmailOtp, isValidEmail } from '@/lib/server/email-otp-auth';
import {
  verifyFirebaseIdToken,
  markFirebaseEmailVerified,
  getFirebaseUserByEmail,
  setFirebaseUserPassword,
} from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const MAX_VERIFY_ATTEMPTS = 5;

// POST body:
//   purpose 'verify': { otp } — email + uid come from the Bearer idToken,
//     never the request body, so a client can never verify someone else's
//     email.
//   purpose 'reset':  { email, otp, newPassword }
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const purpose = body.purpose === 'reset' ? 'reset' : 'verify';
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

  let email = '';
  let uid = '';

  if (purpose === 'verify') {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }
    uid = decoded.uid;
    email = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : '';
  } else {
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (newPassword.length < 6) {
      return NextResponse.json({ verified: false, reason: 'weak_password' }, { status: 400 });
    }
  }

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ verified: false, reason: 'invalid_input' }, { status: 400 });
  }

  let emailHash: string;
  let otpHash: string;
  try {
    emailHash = hashEmail(email);
    otpHash = hashEmailOtp(otp, email);
  } catch {
    return NextResponse.json({ error: 'Server not configured (AUTH_HMAC_SECRET missing).' }, { status: 500 });
  }

  // Atomic verify: locks the latest unused, unexpired row for this email +
  // purpose, enforces the attempt cap, and only marks it used on a correct
  // match. expires_at is checked inside the function itself.
  const { data: verifyResult, error: verifyError } = await supabaseAdmin.rpc('email_verify_otp', {
    p_email_hash: emailHash,
    p_otp_hash: otpHash,
    p_purpose: purpose,
    p_max_attempts: MAX_VERIFY_ATTEMPTS,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  if (!verifyResult.verified) {
    return NextResponse.json({ verified: false, reason: verifyResult.reason }, { status: 400 });
  }

  if (purpose === 'verify') {
    await markFirebaseEmailVerified(uid);
    // Best-effort mirror onto the Supabase profile too — the client will
    // also hit /api/reflex/ensure-profile right after this with a
    // refreshed ID token, which re-syncs this from the token's own claim.
    await supabaseAdmin.from('reflex_profiles').update({ email_verified: true }).eq('uid', uid).then(
      () => {},
      () => {},
    );
    return NextResponse.json({ verified: true });
  }

  // purpose === 'reset'
  const user = await getFirebaseUserByEmail(email);
  if (!user) {
    // Shouldn't happen (send-otp already no-ops for unknown emails), but
    // don't leak account existence either way.
    return NextResponse.json({ verified: false, reason: 'no_active_otp' }, { status: 400 });
  }
  await setFirebaseUserPassword(user.uid, body.newPassword);
  return NextResponse.json({ verified: true });
}
