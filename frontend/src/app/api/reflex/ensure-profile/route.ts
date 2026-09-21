import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { generateReferralCode } from '@/lib/server/referral-code';
import { requireVerifiedFirebaseUid } from '@/lib/server/require-firebase';

export const runtime = 'nodejs';

type PgError = { code?: string; message?: string; details?: string } | null | undefined;

/** Postgres 42703 / PostgREST PGRST204: a column doesn't exist (migration not applied yet). */
function isMissingColumn(err: PgError): boolean {
  if (!err) return false;
  return err.code === '42703' || err.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(err.message || '');
}

/** Which unique constraint a 23505 belongs to. */
function uniqueViolationKind(err: PgError): 'uid' | 'phone' | 'email' | 'referral' | 'unknown' {
  const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
  if (text.includes('email')) return 'email';
  if (text.includes('phone')) return 'phone';
  if (text.includes('referral_code')) return 'referral';
  if (text.includes('pkey') || text.includes('(uid)')) return 'uid';
  return 'unknown';
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  // requireVerifiedFirebaseUid, not the plain uid check — an email/password
  // account whose email isn't verified yet gets a 403 EMAIL_NOT_VERIFIED here
  // and never gets a profile row. Phone accounts are grandfathered through
  // untouched — see the helper's doc comment.
  const authResult = await requireVerifiedFirebaseUid(req);
  if ('error' in authResult) return authResult.error;
  const { uid, token: decoded } = authResult;

  const phone = decoded.phone_number || '';
  // Only trust the email/verified flag straight off the decoded ID token —
  // never anything the client body could claim.
  const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
  const emailVerified = decoded.email_verified === true;
  const authMethod: 'phone' | 'email' = decoded.firebase?.sign_in_provider === 'password' ? 'email' : 'phone';

  const body = await req.json().catch(() => ({}));
  const referredBy = typeof body.referredBy === 'string' ? body.referredBy.trim().toUpperCase() : null;

  const sessionToken = `sess_${crypto.randomUUID()}_${Date.now()}`;

  const { data: existing } = await supabaseAdmin.from('reflex_profiles').select('*').eq('uid', uid).maybeSingle();
  if (existing) {
    // STEP 1 — the session token is the ONLY write that must succeed for an
    // existing account. It gets its own statement so that a problem in the
    // optional identity columns below (e.g. a migration that hasn't been run
    // yet) can never stop an existing phone user from logging in.
    await supabaseAdmin.from('reflex_profiles').update({ current_session_token: sessionToken }).eq('uid', uid);

    // STEP 2 — best-effort identity sync (email / verified / auth_method).
    // Covers: a phone user linking an email later, or a re-login after finally
    // verifying. auth_method flips to 'both' rather than overwriting 'phone'.
    const identity: Record<string, unknown> = {};
    if (email && email !== (existing.email || '').toLowerCase()) identity.email = email;
    if (email && emailVerified !== existing.email_verified) identity.email_verified = emailVerified;
    if (email && existing.auth_method === 'phone') identity.auth_method = 'both';
    else if (!existing.auth_method) identity.auth_method = authMethod;

    let merged: Record<string, unknown> = { ...existing, current_session_token: sessionToken };
    if (Object.keys(identity).length > 0) {
      const { data: updated, error: identityError } = await supabaseAdmin
        .from('reflex_profiles')
        .update(identity)
        .eq('uid', uid)
        .select('*')
        .maybeSingle();
      if (updated) {
        merged = updated;
      } else if (identityError && !isMissingColumn(identityError) && identityError.code !== '23505') {
        console.error('[ensure-profile] identity sync failed', identityError);
      }
      // 23505 here means the email already belongs to another profile row.
      // The fighter keeps their own account untouched; we simply don't attach it.
    }
    return NextResponse.json({ profile: merged, sessionToken, isNew: false });
  }

  // Guard against creating a second row for a phone number that's already
  // registered under a different uid.
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
  // "email already in use" check. (If the email column doesn't exist yet the
  // query errors; we ignore that and let the insert path decide.)
  if (email) {
    const { data: byEmail, error: byEmailError } = await supabaseAdmin
      .from('reflex_profiles')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (!byEmailError && byEmail && byEmail.uid !== uid) {
      return NextResponse.json(
        { error: 'This email is already linked to another account.', code: 'ACCOUNT_EMAIL_CONFLICT' },
        { status: 409 },
      );
    }
  }

  // Insert. Retries only for a genuine referral_code collision. Every other
  // failure is classified so the client gets an accurate error instead of the
  // old catch-all "Could not allocate a referral code".
  let includeEmailColumns = true;
  for (let attempt = 0; attempt < 6; attempt++) {
    const row: Record<string, unknown> = {
      uid,
      phone,
      referral_code: generateReferralCode(),
      referred_by: referredBy,
      current_session_token: sessionToken,
    };
    if (includeEmailColumns) {
      row.email = email || null;
      row.email_verified = emailVerified;
      row.auth_method = authMethod;
    }

    const { data, error } = await supabaseAdmin.from('reflex_profiles').insert(row).select('*').single();
    if (!error) {
      return NextResponse.json({ profile: data, sessionToken, isNew: true });
    }

    // Legacy schema (v21 not applied): retry once without the email columns so
    // signup still works. Run supabase/reflex-schema-v24.sql to fix permanently.
    if (includeEmailColumns && isMissingColumn(error)) {
      console.error('[ensure-profile] email columns missing — run reflex-schema-v24.sql', error.message);
      includeEmailColumns = false;
      continue;
    }

    if (error.code === '23505') {
      const kind = uniqueViolationKind(error);
      if (kind === 'referral') continue; // new code next loop
      if (kind === 'email') {
        return NextResponse.json(
          { error: 'This email is already linked to another account.', code: 'ACCOUNT_EMAIL_CONFLICT' },
          { status: 409 },
        );
      }
      if (kind === 'phone') {
        return NextResponse.json(
          { error: 'This phone number is already linked to another account.', code: 'ACCOUNT_PHONE_CONFLICT' },
          { status: 409 },
        );
      }
      // uid (or unknown): a concurrent request just created this same row
      // (e.g. the verify page and the app layout both calling us at once).
      const { data: raced } = await supabaseAdmin.from('reflex_profiles').select('*').eq('uid', uid).maybeSingle();
      if (raced) {
        await supabaseAdmin.from('reflex_profiles').update({ current_session_token: sessionToken }).eq('uid', uid);
        return NextResponse.json({ profile: { ...raced, current_session_token: sessionToken }, sessionToken, isNew: false });
      }
      continue;
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'Could not create your profile. Please try again.' }, { status: 500 });
}
