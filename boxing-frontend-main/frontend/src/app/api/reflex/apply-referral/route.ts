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

  // Referral codes are a new-account perk only. An account that's more than
  // a short window past its own creation is not "a new signup" anymore
  const REFERRAL_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
  const createdAt = me.created_at ? new Date(me.created_at).getTime() : 0;
  if (!createdAt || Date.now() - createdAt > REFERRAL_WINDOW_MS) {
    return NextResponse.json({ error: 'Referral codes can only be applied when creating a new account.' }, { status: 400 });
  }

  if (me.referral_code === code) {
    return NextResponse.json({ error: 'You cannot use your own code.' }, { status: 400 });
  }

  // 1. Check if referral code exists in reflex_profiles
  const { data: profileReferrer } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid, referral_code')
    .eq('referral_code', code)
    .maybeSingle();

  // 2. Check if referral code exists in sparai_collaborators
  let collabReferrer = null;
  if (!profileReferrer) {
    try {
      const { data: collab } = await supabaseAdmin
        .from('sparai_collaborators')
        .select('id, referral_code, is_active')
        .eq('referral_code', code)
        .eq('is_active', true)
        .maybeSingle();
      collabReferrer = collab;
    } catch (err) {
      console.warn('collaborator check warning:', err);
    }
  }

  if (!profileReferrer && !collabReferrer) {
    return NextResponse.json({ error: 'Referral code not found.' }, { status: 404 });
  }

  // Update user's referred_by in reflex_profiles
  const { error: updateError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ 
      referred_by: code,
      has_claimed_referral_bonus: true,
      updated_at: new Date().toISOString()
    })
    .eq('uid', decoded.uid)
    .is('referred_by', null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If referrer is a reflex profile user, trigger RPC reward
  if (profileReferrer) {
    try {
      await supabaseAdmin.rpc('claim_referral', { p_uid: decoded.uid });
    } catch (err) {
      console.warn('claim_referral rpc non-critical:', err);
    }
  }

  return NextResponse.json({ ok: true, referred_by: code });
}
