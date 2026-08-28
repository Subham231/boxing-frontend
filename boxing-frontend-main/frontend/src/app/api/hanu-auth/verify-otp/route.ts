import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateReferralCode } from '@/lib/server/referral-code';
import {
  HANU_SESSION_COOKIE,
  generateHanuUid,
  generateSessionToken,
  hashOtp,
  hashPhone,
  hashSessionToken,
  isValidE164,
  sessionExpiryTimestamp,
} from '@/lib/server/hanu-auth';

export const runtime = 'nodejs';

// Dark-launch status: nothing calls this route yet — see
// /hanuotp-integration-plan.md.

const MAX_VERIFY_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

  if (!isValidE164(phone) || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ verified: false, reason: 'invalid_input' }, { status: 400 });
  }

  let phoneHash: string;
  let otpHash: string;
  try {
    phoneHash = hashPhone(phone);
    otpHash = hashOtp(otp, phone);
  } catch {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  // Atomic verify: locks the latest unused, unexpired row for this phone,
  // enforces the 5-attempt cap, and only marks it used on a correct match.
  // expires_at is checked inside the function itself, so an expired row
  // can never verify even if the cleanup job hasn't run yet.
  const { data: verifyResult, error: verifyError } = await supabaseAdmin.rpc('hanu_verify_otp', {
    p_phone_hash: phoneHash,
    p_otp_hash: otpHash,
    p_max_attempts: MAX_VERIFY_ATTEMPTS,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  if (!verifyResult.verified) {
    return NextResponse.json({ verified: false, reason: verifyResult.reason }, { status: 400 });
  }

  // Find-or-create the reflex_profiles row for this phone. Mirrors the
  // existing /api/reflex/ensure-profile phone-conflict handling, just
  // keyed off phone instead of a Firebase uid (there is no Firebase uid in
  // this flow).
  const { data: existingByPhone } = await supabaseAdmin
    .from('reflex_profiles')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  let profile = existingByPhone;

  if (!profile) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      const { data, error } = await supabaseAdmin
        .from('reflex_profiles')
        .insert({
          uid: generateHanuUid(),
          phone,
          referral_code: code,
        })
        .select('*')
        .single();

      if (!error) {
        profile = data;
        break;
      }
      // 23505 = unique_violation on referral_code — retry with a new code.
      if (error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    if (!profile) {
      return NextResponse.json({ error: 'Could not allocate a referral code.' }, { status: 500 });
    }
  }

  const sessionToken = generateSessionToken();
  const { error: sessionError } = await supabaseAdmin.from('hanu_auth_sessions').insert({
    uid: profile.uid,
    session_hash: hashSessionToken(sessionToken),
    expires_at: sessionExpiryTimestamp(),
  });

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const response = NextResponse.json({ verified: true, profile });
  response.cookies.set(HANU_SESSION_COOKIE.name, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: HANU_SESSION_COOKIE.maxAgeSeconds,
    path: '/',
  });
  return response;
}
