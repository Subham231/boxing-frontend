import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

function obfuscateEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const visible = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${visible}@${domain}`;
}

/**
 * Endpoint for phone-only fighters to set an email and password on their
 * existing account when SMS verification is unavailable.
 *
 * It finds the existing fighter by phone number, ensures no email is already
 * attached, updates the exact same Firebase UID and Supabase profile row,
 * preserving all streak, scores, subscription, and referral data.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const rawPhone = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, '').trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^\+[1-9]\d{7,14}$/.test(rawPhone)) {
    return NextResponse.json({ error: 'Enter your phone number in international format, e.g. +919876543210.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  // 1. Locate the fighter in Supabase reflex_profiles or Firebase
  const { data: profile } = await supabaseAdmin
    .from('reflex_profiles')
    .select('*')
    .eq('phone', rawPhone)
    .maybeSingle();

  const auth = getAuth(getFirebaseAdminApp());
  let firebaseUser = null;
  try {
    firebaseUser = await auth.getUserByPhoneNumber(rawPhone);
  } catch (e: any) {
    if (e.code !== 'auth/user-not-found') {
      console.error('[link-phone-email] error looking up phone in Firebase', e);
    }
  }

  if (!profile && !firebaseUser) {
    return NextResponse.json({ error: 'No fighter account was found for this phone number.' }, { status: 404 });
  }

  const targetUid = profile?.uid || firebaseUser?.uid;
  if (!targetUid) {
    return NextResponse.json({ error: 'Could not identify fighter account.' }, { status: 500 });
  }

  // 2. If the profile already has an email, reject re-linking without verification
  if (profile?.email) {
    return NextResponse.json(
      {
        error: `This account is already linked to email ${obfuscateEmail(profile.email)}. Please sign in using that email.`,
        code: 'ALREADY_LINKED',
        emailObfuscated: obfuscateEmail(profile.email),
      },
      { status: 409 },
    );
  }

  // 3. Ensure the desired email is not taken by another account
  const { data: emailConflict } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid')
    .ilike('email', email)
    .maybeSingle();

  if (emailConflict && emailConflict.uid !== targetUid) {
    return NextResponse.json({ error: 'This email is already linked to another fighter account.' }, { status: 409 });
  }

  try {
    const existingEmailUser = await auth.getUserByEmail(email);
    if (existingEmailUser && existingEmailUser.uid !== targetUid) {
      return NextResponse.json({ error: 'This email is already in use by another account. Please use a different email.' }, { status: 409 });
    }
  } catch (e: any) {
    // auth/user-not-found is expected and good
    if (e.code !== 'auth/user-not-found') {
      console.error('[link-phone-email] error checking email in Firebase', e);
    }
  }

  // 4. Update the Firebase account with email and password
  try {
    if (firebaseUser) {
      await auth.updateUser(firebaseUser.uid, {
        email,
        password,
        emailVerified: false,
      });
    } else {
      // Create Firebase account with the existing Supabase UID
      await auth.createUser({
        uid: targetUid,
        email,
        password,
        phoneNumber: rawPhone,
        emailVerified: false,
      });
    }
  } catch (e: any) {
    console.error('[link-phone-email] failed to update Firebase credentials', e);
    return NextResponse.json({ error: e?.message || 'Could not attach email and password.' }, { status: 500 });
  }

  // 5. Update Supabase profile row
  const { error: dbError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({
      email,
      email_verified: false,
      auth_method: 'both',
    })
    .eq('uid', targetUid);

  if (dbError) {
    console.error('[link-phone-email] failed to update Supabase profile', dbError);
    // Non-fatal if schema column missing, user can still sign in
  }

  return NextResponse.json({
    success: true,
    uid: targetUid,
    email,
    message: 'Email & password successfully attached. You can now log in.',
  });
}
