import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendOtpEmail } from '@/lib/server/email-otp';
import { generateOtp, hashEmail, hashEmailOtp, isValidEmail, otpExpiryTimestamp } from '@/lib/server/email-otp-auth';
import { verifyFirebaseIdToken, getFirebaseUserByEmail } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const MAX_SENDS_PER_DAY = 5;
const RESEND_COOLDOWN_SECONDS = 45;

// POST body: { email, purpose: 'verify' | 'reset' }
//
// purpose 'verify': caller must be signed in (Authorization: Bearer
// <Firebase idToken>) — we send the code to that user's own email, not
// whatever email a client could claim in the body.
//
// purpose 'reset': no session yet (the fighter forgot their password), so
// we look the account up by the email in the body. Always returns the same
// { allowed: true } response whether or not that email has an account, so
// this endpoint can never be used to enumerate registered emails.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const purpose = body.purpose === 'reset' ? 'reset' : 'verify';
  let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

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
    email = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'This account has no email on file.' }, { status: 400 });
    }
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  let emailHash: string;
  try {
    emailHash = hashEmail(email);
  } catch {
    return NextResponse.json({ error: 'Server not configured (AUTH_HMAC_SECRET missing).' }, { status: 500 });
  }

  // Atomic check-and-increment — see email_check_and_send_otp in
  // reflex-schema-v24.sql.
  const { data: limitResult, error: limitError } = await supabaseAdmin.rpc('email_check_and_send_otp', {
    p_email_hash: emailHash,
    p_max_per_day: MAX_SENDS_PER_DAY,
    p_cooldown_seconds: RESEND_COOLDOWN_SECONDS,
  });

  if (limitError) {
    return NextResponse.json({ error: limitError.message }, { status: 500 });
  }

  if (!limitResult.allowed) {
    const message =
      limitResult.reason === 'cooldown'
        ? `Please wait ${limitResult.retry_after_seconds}s before requesting another code.`
        : `Daily limit of ${MAX_SENDS_PER_DAY} code requests reached. Try again tomorrow.`;
    return NextResponse.json({ allowed: false, reason: limitResult.reason, message }, { status: 429 });
  }

  // For 'reset', silently no-op (but still report allowed:true) if no
  // account exists for this email — never leak which emails are registered.
  if (purpose === 'reset') {
    const user = await getFirebaseUserByEmail(email).catch(() => null);
    if (!user) {
      return NextResponse.json({ allowed: true, remaining: limitResult.remaining });
    }
  }

  const otp = generateOtp();

  // Don't write the OTP row until the email provider confirms the send —
  // an OTP that was never delivered should never be "active."
  const sendResult = await sendOtpEmail(email, otp, purpose);
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
    purpose,
    expires_at: otpExpiryTimestamp(10),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ allowed: true, remaining: limitResult.remaining });
}
