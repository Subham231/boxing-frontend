import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin';
import { requireFirebaseUid } from '@/lib/server/require-firebase';

export const runtime = 'nodejs';

/**
 * Endpoint for fighters to set, link, or re-update an email on their account.
 * Works both:
 * 1. For authenticated sessions (via Authorization header).
 * 2. For unauthenticated phone account recovery (via phone number).
 *
 * It safely resolves empty duplicate stub accounts created during prior testing
 * and attaches the email to the primary fighter account, preserving all data.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  let authenticatedUid: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const authResult = await requireFirebaseUid(req);
    if (!('error' in authResult)) {
      authenticatedUid = authResult.uid;
    }
  }

  const body = await req.json().catch(() => ({}));
  const rawPhone = typeof body.phone === 'string' ? body.phone.replace(/\s+/g, '').trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const auth = getAuth(getFirebaseAdminApp());

  let targetUid = authenticatedUid;
  let rawPhoneNumber = rawPhone;

  // If not authenticated via header, look up target by phone number
  if (!targetUid) {
    if (!rawPhone || !/^\+[1-9]\d{7,14}$/.test(rawPhone)) {
      return NextResponse.json({ error: 'Enter your phone number in international format, e.g. +919876543210.' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('reflex_profiles')
      .select('*')
      .eq('phone', rawPhone)
      .maybeSingle();

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

    targetUid = profile?.uid || firebaseUser?.uid || null;
  }

  if (!targetUid) {
    return NextResponse.json({ error: 'Could not identify fighter account.' }, { status: 500 });
  }

  // Retrieve current target user from Firebase
  let currentTargetUser = null;
  try {
    currentTargetUser = await auth.getUser(targetUid);
    if (currentTargetUser.phoneNumber) {
      rawPhoneNumber = currentTargetUser.phoneNumber;
    }
  } catch (e: any) {
    if (e.code !== 'auth/user-not-found') {
      console.error('[link-phone-email] error fetching target user', e);
    }
  }

  // Check if the desired email is registered to another UID
  try {
    const existingEmailUser = await auth.getUserByEmail(email);
    if (existingEmailUser && existingEmailUser.uid !== targetUid) {
      // Check if existingEmailUser is just an empty orphan/stub account from prior testing
      const { data: conflictProfile } = await supabaseAdmin
        .from('reflex_profiles')
        .select('*')
        .eq('uid', existingEmailUser.uid)
        .maybeSingle();

      const hasRealData =
        existingEmailUser.phoneNumber ||
        (conflictProfile &&
          (conflictProfile.phone ||
            (conflictProfile.onboarding_data && Object.keys(conflictProfile.onboarding_data).length > 1)));

      if (!hasRealData) {
        // Safe to delete the empty stub shell so the fighter can claim their real email!
        console.log(`[link-phone-email] Evicting empty stub account ${existingEmailUser.uid} for ${email}`);
        try {
          await auth.deleteUser(existingEmailUser.uid);
          if (conflictProfile) {
            await supabaseAdmin.from('reflex_profiles').delete().eq('uid', existingEmailUser.uid);
          }
        } catch (delErr) {
          console.error('[link-phone-email] error deleting empty stub', delErr);
        }
      } else {
        return NextResponse.json(
          { error: 'This email is already in use by another active account. Please use a different email.' },
          { status: 409 }
        );
      }
    }
  } catch (e: any) {
    if (e.code !== 'auth/user-not-found') {
      console.error('[link-phone-email] error checking email', e);
    }
  }

  // Check Supabase conflict
  const { data: emailConflict } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid')
    .ilike('email', email)
    .maybeSingle();

  if (emailConflict && emailConflict.uid !== targetUid) {
    // If the Supabase conflict was a dangling row without phone, clean it
    const { data: conflictRow } = await supabaseAdmin
      .from('reflex_profiles')
      .select('*')
      .eq('uid', emailConflict.uid)
      .maybeSingle();

    if (conflictRow && !conflictRow.phone && (!conflictRow.onboarding_data || Object.keys(conflictRow.onboarding_data).length <= 1)) {
      await supabaseAdmin.from('reflex_profiles').delete().eq('uid', emailConflict.uid);
    } else {
      return NextResponse.json({ error: 'This email is already linked to another fighter account.' }, { status: 409 });
    }
  }

  // Update or create Firebase user
  try {
    if (currentTargetUser) {
      const updatePayload: Record<string, any> = {
        email,
      };
      if (password && password.length >= 6) {
        updatePayload.password = password;
      }
      await auth.updateUser(targetUid, updatePayload);
    } else {
      const createPayload: Record<string, any> = {
        uid: targetUid,
        email,
        emailVerified: false,
      };
      if (rawPhoneNumber) {
        createPayload.phoneNumber = rawPhoneNumber;
      }
      if (password && password.length >= 6) {
        createPayload.password = password;
      }
      await auth.createUser(createPayload);
    }
  } catch (e: any) {
    console.error('[link-phone-email] failed to update Firebase credentials', e);
    return NextResponse.json({ error: e?.message || 'Could not attach email.' }, { status: 500 });
  }

  // Update Supabase profile row
  const { error: dbError } = await supabaseAdmin
    .from('reflex_profiles')
    .update({
      email,
      auth_method: 'both',
    })
    .eq('uid', targetUid);

  if (dbError) {
    console.error('[link-phone-email] failed to update Supabase profile', dbError);
  }

  return NextResponse.json({
    success: true,
    uid: targetUid,
    email,
    message: 'Email successfully linked to your account.',
  });
}
