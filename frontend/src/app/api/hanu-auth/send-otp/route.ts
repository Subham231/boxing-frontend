import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendHanuOtp } from '@/lib/server/hanuotp';
import {
  generateOtp,
  hashOtp,
  hashPhone,
  isValidE164,
  otpExpiryTimestamp,
} from '@/lib/server/hanu-auth';

export const runtime = 'nodejs';

// Dark-launch status: nothing calls this route yet — see
// /hanuotp-integration-plan.md. Test directly via curl/Postman during
// phase 1, e.g.:
//   curl -X POST /api/hanu-auth/send-otp -H 'Content-Type: application/json' \
//     -d '{"phone":"+91XXXXXXXXXX"}'

const MAX_SENDS_PER_DAY = 3;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!isValidE164(phone)) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
  }

  let phoneHash: string;
  try {
    phoneHash = hashPhone(phone);
  } catch {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  // Atomic check-and-increment — locks the day's row so two simultaneous
  // requests can't both slip past the cap. See hanu_check_and_send_otp in
  // reflex-schema-v20.sql.
  const { data: limitResult, error: limitError } = await supabaseAdmin.rpc(
    'hanu_check_and_send_otp',
    {
      p_phone_hash: phoneHash,
      p_max_per_day: MAX_SENDS_PER_DAY,
      p_cooldown_seconds: RESEND_COOLDOWN_SECONDS,
    }
  );

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

  const otp = generateOtp();

  // Do NOT write the OTP row until HanuOTP confirms the send succeeded —
  // an OTP that was never delivered should never be "active."
  const sendResult = await sendHanuOtp(phone, otp);
  if (!sendResult.success) {
    return NextResponse.json(
      { allowed: false, reason: 'delivery_failed', message: 'Could not send the code. Please try again.' },
      { status: 502 }
    );
  }

  const otpHash = hashOtp(otp, phone);
  const { error: insertError } = await supabaseAdmin.from('hanu_otp_verifications').insert({
    phone_hash: phoneHash,
    otp_hash: otpHash,
    expires_at: otpExpiryTimestamp(5),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ allowed: true, remaining: limitResult.remaining });
}
