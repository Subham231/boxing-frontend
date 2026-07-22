import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

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

  const body = await req.json().catch(() => ({}));
  const code =
    typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code || code.length < 4) {
    return NextResponse.json({ error: 'Enter a valid referral code.' }, { status: 400 });
  }

  const { data: me, error: meError } = await supabaseAdmin
    .from('reflex_profiles')
    .select('*')
    .eq('uid', decoded.uid)
    .maybeSingle();

  if (meError || !me) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  if (me.has_claimed_referral_bonus) {
    return NextResponse.json({ error: 'Referral already applied.' }, { status: 400 });
  }

  if (me.referred_by) {
    return NextResponse.json({ error: 'You already used a referral code.' }, { status: 400 });
  }

  if (me.referral_code === code) {
    return NextResponse.json({ error: 'You cannot use your own code.' }, { status: 400 });
  }

  const { data: referrer } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid, referral_code')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: 'Referral code not found.' }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ referred_by: code })
    .eq('uid', decoded.uid)
    .is('referred_by', null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_referral', {
    p_uid: decoded.uid,
  });

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, claim: claimData });
}
