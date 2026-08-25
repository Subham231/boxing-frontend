import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

const MAX_ATTEMPTS_PER_DAY = 3;

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ allowed: false, reason: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ allowed: false, reason: 'Invalid phone number.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('check_and_increment_otp_attempt', {
    p_phone: phone,
    p_max_per_day: MAX_ATTEMPTS_PER_DAY,
  });

  if (error) {
    return NextResponse.json({ allowed: false, reason: error.message }, { status: 500 });
  }

  if (!data.allowed) {
    return NextResponse.json({
      allowed: false,
      reason: `This number has hit today's limit of ${MAX_ATTEMPTS_PER_DAY} code requests. Try again tomorrow.`,
    });
  }

  return NextResponse.json({ allowed: true, remaining: data.remaining });
}
