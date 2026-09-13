import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateReferralCode } from '@/lib/server/referral-code';
import { requireVerifiedFirebaseUid } from '@/lib/server/require-firebase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  // requireVerifiedFirebaseUid, not the plain uid check — this is the one
  // enforcement point that matters: an email/password account whose email
  // isn't verified yet gets a 403 EMAIL_NOT_VERIFIED here and never gets a
  // profile row (and therefore never passes the app's onboarding/dashboard
  // gate in (app)/layout.tsx). Phone accounts are unaffected — see the
  // helper's doc comment.
  const authResult = await requireVerifiedFirebaseUid(req);
  if ('error' in authResult) return authResult.error;
  const { uid, token: decoded } = authResult;

  const phone = decoded.phone_number || '';
  // Only trust the email/verified flag straight off the decoded ID token —
  // never anything the client body could claim.
  const email = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : '';
  const emailVerified = decoded.email_verified === true;
  const authMethod: 'phone' | 'email' = decoded.firebase?.sign_in_provider === 'password' ? 'email' : 'phone';

  const body = await req.json().catch(() => ({}));
  const referredBy = typeof body.referredBy === 'string' ? body.referredBy.trim().toUpperCase() : null;

  const sessionToken = `sess_${crypto.randomUUID()}_${Date.now()}`;

  const { data: existing } = await supabaseAdmin.from('reflex_profiles').select('*').eq('uid', uid).maybeSingle();
  if (existing) {
    // Keep the profile's email/verified state in sync (covers: a phone
    // user linking an email later, or a re-login after finally verifying).
    // auth_method flips to 'both' rather than overwriting 'phone' once an
    // email has been linked, so we never lose the fact this uid can also
    // log in by phone.
    const updates: Record<string, unknown> = { current_session_token: sessionToken };
    if (email && email !== existing.email) updates.email = email;
    if (email && emailVerified !== existing.email_verified) updates.email_verified = emailVerified;
    if (email && existing.auth_method === 'phone') updates.auth_method = 'both';
    else if (!existing.auth_method) updates.auth_method = authMethod;

    const { data: updated } = await supabaseAdmin
      .from('reflex_profiles')
      .update(updates)
      .eq('uid', uid)
      .select('*')
      .single();
    return NextResponse.json({ profile: updated || { ...existing, ...updates }, sessionToken, isNew: false });
  }

  // Guard against creating a second row for a phone number that's already
  // registered under a different uid (this is what caused the same number
  // to end up registered twice). If a row already exists for this phone,
  // return that one instead of inserting a duplicate.
  if (phone) {
    const { data: byPhone } = await supabaseAdmin
      .from('reflex_profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (byPhone) {
      if (byPhone.uid !== uid) {
        return NextResponse.json(
          { error: 'This phone number is already linked to another account.', code: 'ACCOUNT_PHONE_CONFLICT' },
          { status: 409 },
        );
      }
      await supabaseAdmin.from('reflex_profiles').update({ current_session_token: sessionToken }).eq('uid', uid);
      return NextResponse.json({ profile: { ...byPhone, current_session_token: sessionToken }, sessionToken, isNew: false });
    }
  }

  // Same guard for email — belt-and-suspenders alongside Firebase's own
  // "email already in use" check, in case a Supabase row ever exists
  // without a matching Firebase account (e.g. partial past migration).
  if (email) {
    const { data: byEmail } = await supabaseAdmin
      .from('reflex_profiles')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (byEmail && byEmail.uid !== uid) {
      return NextResponse.json(
        { error: 'This email is already linked to another account.', code: 'ACCOUNT_EMAIL_CONFLICT' },
        { status: 409 },
      );
    }
  }

  // Try a few times in case of a (rare) referral_code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const { data, error } = await supabaseAdmin
      .from('reflex_profiles')
      .insert({
        uid,
        phone,
        email: email || null,
        email_verified: emailVerified,
        auth_method: authMethod,
        referral_code: code,
        referred_by: referredBy,
        current_session_token: sessionToken,
      })
      .select('*')
      .single();

    if (!error) {
      return NextResponse.json({ profile: data, sessionToken, isNew: true });
    }
    // 23505 = unique_violation (Postgres) — collision on referral_code, retry.
    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Could not allocate a referral code.' }, { status: 500 });
}
