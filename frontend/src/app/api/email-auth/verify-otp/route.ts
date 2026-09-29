import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { hashEmail, hashEmailOtp, isValidEmail } from '@/lib/server/email-otp-auth';
import { getFirebaseUserByEmail, setFirebaseUserPassword } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const MAX_VERIFY_ATTEMPTS = 5;

// Email signup and verification use Firebase one-click links. This endpoint
// is retained only to verify password-reset codes for legacy accounts.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.purpose !== 'reset') {
    return NextResponse.json(
      { error: 'Email verification uses a one-click Firebase link. OTP is only available for password reset.' },
      { status: 400 },
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (newPassword.length < 6) {
    return NextResponse.json({ verified: false, reason: 'weak_password' }, { status: 400 });
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

  const { data: verifyResult, error: verifyError } = await supabaseAdmin.rpc('email_verify_otp', {
    p_email_hash: emailHash,
    p_otp_hash: otpHash,
    p_purpose: 'reset',
    p_max_attempts: MAX_VERIFY_ATTEMPTS,
  });

  if (verifyError) {
    if (verifyError.code === 'PGRST202') {
      console.error('[email-auth/verify-otp] password-reset RPC is missing from the Supabase schema cache.');
      return NextResponse.json(
        {
          error:
            'Password-reset database setup is incomplete. Apply supabase/reflex-schema-v24.sql in the Supabase SQL Editor, then reload the schema cache.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  if (!verifyResult.verified) {
    return NextResponse.json({ verified: false, reason: verifyResult.reason }, { status: 400 });
  }

  const user = await getFirebaseUserByEmail(email);
  if (!user) {
    return NextResponse.json({ verified: false, reason: 'no_active_otp' }, { status: 400 });
  }
  await setFirebaseUserPassword(user.uid, newPassword);
  return NextResponse.json({ verified: true });
}
