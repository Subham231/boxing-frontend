import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendOtpEmail } from '@/lib/server/email-otp';
import { generateOtp, hashEmail, hashEmailOtp, isValidEmail, otpExpiryTimestamp } from '@/lib/server/email-otp-auth';
import { getFirebaseUserByEmail } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const MAX_SENDS_PER_DAY = 5;
const RESEND_COOLDOWN_SECONDS = 45;

// Email signup and verification use Firebase one-click links. This endpoint
// is retained only for password-reset codes for legacy password accounts.
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
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  let emailHash: string;
  try {
    emailHash = hashEmail(email);
  } catch {
    return NextResponse.json({ error: 'Server not configured (AUTH_HMAC_SECRET missing).' }, { status: 500 });
  }

  const { data: limitResult, error: limitError } = await supabaseAdmin.rpc('email_check_and_send_otp', {
    p_email_hash: emailHash,
    p_max_per_day: MAX_SENDS_PER_DAY,
    p_cooldown_seconds: RESEND_COOLDOWN_SECONDS,
  });

  if (limitError) {
    if (limitError.code === 'PGRST202') {
      console.error('[email-auth/send-otp] password-reset RPC is missing from the Supabase schema cache.');
      return NextResponse.json(
        {
          error:
            'Password-reset database setup is incomplete. Apply supabase/reflex-schema-v24.sql in the Supabase SQL Editor, then reload the schema cache.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: limitError.message }, { status: 500 });
  }

  if (!limitResult.allowed) {
    const message =
      limitResult.reason === 'cooldown'
        ? `Please wait ${limitResult.retry_after_seconds}s before requesting another code.`
        : `Daily limit of ${MAX_SENDS_PER_DAY} code requests reached. Try again tomorrow.`;
    return NextResponse.json({ allowed: false, reason: limitResult.reason, message }, { status: 429 });
  }

  // Always give the same response for unknown emails to prevent account enumeration.
  const user = await getFirebaseUserByEmail(email).catch(() => null);
  if (!user) {
    return NextResponse.json({ allowed: true, remaining: limitResult.remaining });
  }

  const otp = generateOtp();
  const sendResult = await sendOtpEmail(email, otp);
  if (!sendResult.success) {
    console.error('[email-auth/send-otp] delivery failed:', sendResult.errorMessage);
    return NextResponse.json(
      { allowed: false, reason: 'delivery_failed', message: 'Could not send the code. Please try again.' },
      { status: 502 },
    );
  }

  const otpHash = hashEmailOtp(otp, email);
  const { error: insertError } = await supabaseAdmin.from('email_otp_verifications').insert({
    email_hash: emailHash,
    otp_hash: otpHash,
    purpose: 'reset',
    expires_at: otpExpiryTimestamp(10),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ allowed: true, remaining: limitResult.remaining });
}
