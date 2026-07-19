import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateReferralCode } from '@/lib/server/referral-code';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) {
    return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const uid = decoded.uid;
  const phone = decoded.phone_number || '';
  const body = await req.json().catch(() => ({}));
  const referredBy = typeof body.referredBy === 'string' ? body.referredBy.trim().toUpperCase() : null;

  const { data: existing } = await supabaseAdmin.from('reflex_profiles').select('*').eq('uid', uid).maybeSingle();
  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  // Try a few times in case of a (rare) referral_code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const { data, error } = await supabaseAdmin
      .from('reflex_profiles')
      .insert({
        uid,
        phone,
        referral_code: code,
        referred_by: referredBy,
      })
      .select('*')
      .single();

    if (!error) {
      return NextResponse.json({ profile: data });
    }
    // 23505 = unique_violation (Postgres) — collision on referral_code, retry.
    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Could not allocate a referral code.' }, { status: 500 });
}
