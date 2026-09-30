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

  // Record attribution atomically: the update only matches while no code has
  // been recorded yet, so two quick taps (or two tabs) can't both apply.
  const { data: attributed, error: updateError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ referred_by: code, updated_at: new Date().toISOString() })
    .eq('uid', decoded.uid)
    .is('referred_by', null)
    .select('uid')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!attributed) {
    return NextResponse.json({ error: 'You already used a referral code.' }, { status: 400 });
  }

  // Credit the referrer (count + their own 5-referral reward). This only
  // applies to codes that belong to a user; collaborator codes have no
  // referrer row to credit. claim_referral also marks this account as
  // has_claimed_referral_bonus on success.
  //
  // NOTE: has_claimed_referral_bonus must NOT be set before this call —
  // claim_referral returns "nothing to claim" when it is already true, which
  // used to skip crediting the referrer entirely.
  let referrerCredited = false;
  if (referrerUser) {
    const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_referral', {
      p_uid: decoded.uid,
    });
    if (claimError) {
      console.error('claim_referral failed:', claimError.message);
    } else {
      referrerCredited = !!(claimData as { claimed?: boolean } | null)?.claimed;
    }
  }
  if (!referrerUser) {
    // Collaborator code: nothing to credit, just mark the bonus as used.
    await supabaseAdmin
      .from('reflex_profiles')
      .update({ has_claimed_referral_bonus: true, updated_at: new Date().toISOString() })
      .eq('uid', decoded.uid);
  }

  // Grant the new user's own 30-day trial. Never overwrite an active paid
  // plan; stack on top of an already-running referral reward.
  const { data: current } = await supabaseAdmin
    .from('reflex_profiles')
    .select('plan, plan_expires_at')
    .eq('uid', decoded.uid)
    .maybeSingle();

  const nowMs = Date.now();
  const expiresMs = current?.plan_expires_at ? new Date(current.plan_expires_at).getTime() : 0;
  const planActive = expiresMs > nowMs;
  const paidPlanActive =
    planActive && !!current?.plan && current.plan !== 'free' && current.plan !== 'referral_reward';

  let trialGranted = false;
  if (!paidPlanActive) {
    const startMs = planActive ? expiresMs : nowMs;
    const { error: grantError } = await supabaseAdmin
      .from('reflex_profiles')
      .update({
        plan: 'referral_reward',
        ...(planActive ? {} : { plan_started_at: new Date(nowMs).toISOString() }),
        plan_expires_at: new Date(startMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('uid', decoded.uid);
    if (grantError) {
      console.error('referral trial grant failed:', grantError.message);
    } else {
      trialGranted = true;
    }
  }

  return NextResponse.json({
    ok: true,
    trialGranted,
    referrerCredited,
    message: trialGranted ? '30-day referral trial unlocked!' : 'Referral code applied.',
  });
}
