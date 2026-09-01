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
  if (!code || code.length < 3) {
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

  // 1. Check if code exists in reflex_profiles
  const { data: referrerUser } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid, referral_code')
    .eq('referral_code', code)
    .maybeSingle();

  // 2. Also check if code exists in sparai_collaborators
  let collaboratorRecord: any = null;
  try {
    const { data: collab } = await supabaseAdmin
      .from('sparai_collaborators')
      .select('id, referral_code, is_active')
      .eq('referral_code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (collab) collaboratorRecord = collab;
  } catch (err) {
    console.warn('sparai_collaborators check warning:', err);
  }

  if (!referrerUser && !collaboratorRecord) {
    return NextResponse.json({ error: `Referral code "${code}" not found.` }, { status: 404 });
  }

  // Record referral attribution in reflex_profiles
  const { error: updateError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ 
      referred_by: code,
      has_claimed_referral_bonus: true,
      updated_at: new Date().toISOString()
    })
    .eq('uid', decoded.uid);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Attempt RPC or direct bonus grant
  try {
    const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_referral', {
      p_uid: decoded.uid,
    });
    if (!claimError) {
      return NextResponse.json({ ok: true, claim: claimData });
    }
  } catch (rpcErr) {
    console.warn('claim_referral RPC fallback:', rpcErr);
  }

  // Fallback: grant 30-day reward directly
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('reflex_profiles')
    .update({
      plan: 'referral_reward',
      plan_expires_at: thirtyDaysLater,
      has_claimed_referral_bonus: true,
      updated_at: new Date().toISOString()
    })
    .eq('uid', decoded.uid);

  return NextResponse.json({ ok: true, message: '30-day referral trial unlocked!' });
}