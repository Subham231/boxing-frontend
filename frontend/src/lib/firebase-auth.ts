import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

export interface UserProfile {
  uid: string;
  phone: string;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  has_claimed_referral_bonus: boolean;
  subscription_until: string | null;
  created_at: string;
  // Added by the Premium Subscription system (reflex-schema-v6.sql).
  // Optional because older cached client bundles / rows created before the
  // migration ran may not have them yet.
  plan?: string | null;
  plan_expires_at?: string | null;
  referral_bonus_5_claimed?: boolean;
  // Profile fields saved via save-profile-details (reflex-schema-v2+).
  display_name?: string | null;
  age?: number | null;
  profession?: string | null;
  avatar_url?: string | null;
  promise_word?: string | null;
  // Bulk onboarding payload saved via sync-to-supabase (v7+).
  onboarding_data?: Record<string, unknown> | null;
}

const recaptchaVerifiers = new Map<string, RecaptchaVerifier>();

// Phone OTP architecture:
//   1. Firebase Auth sends + verifies the SMS code (RecaptchaVerifier +
//      signInWithPhoneNumber + confirmation.confirm).
//   2. Supabase NEVER sends SMS. It only rate-limits send attempts
//      (/api/reflex/otp-rate-limit) and stores the user profile after a
//      successful Firebase verify (/api/reflex/ensure-profile).
//
// Must be called with the id of a container element already mounted in the
// DOM before sending an OTP (empty <div id="…" /> on the login/signup OTP
// screens). A verifier is recreated FRESH every call — reusing one across
// sends causes "reCAPTCHA client element has been removed". Keying by
// container id keeps onboarding OTP and Reflex login from tearing each
// other down.
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  const existing = recaptchaVerifiers.get(containerId);
  if (existing) {
    try {
      existing.clear();
    } catch {
      // The container may already be gone (e.g. the component that owned
      // it unmounted) — that's fine, we're replacing it either way.
    }
    recaptchaVerifiers.delete(containerId);
  }

  // Invisible reCAPTCHA — same pattern as Firebase phone-auth docs
  // (getAuth + RecaptchaVerifier with size: 'invisible').
  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved — signInWithPhoneNumber can proceed.
    },
    'expired-callback': () => {
      // Token expired; next sendOtp() recreates a fresh verifier.
    },
  });
  recaptchaVerifiers.set(containerId, verifier);
  return verifier;
}

export async function checkPhoneExists(phoneNumberE164: string): Promise<boolean> {
  try {
    const res = await fetch('/api/reflex/check-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumberE164 }),
    });
    const data = await res.json();
    return !!data.exists;
  } catch {
    return false;
  }
}

export async function checkOtpRateLimit(phoneNumberE164: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const res = await fetch('/api/reflex/otp-rate-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneNumberE164 }),
  });
  return res.json();
}

/** Map Firebase Auth / reCAPTCHA errors to something a fighter can act on. */
export function formatPhoneAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Could not send verification code.';

  if (
    code === 'auth/captcha-check-failed' ||
    /Hostname match not found/i.test(message)
  ) {
    const host =
      typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `This site (${host}) is not authorized for phone login in Firebase. Add "${host}" under Authentication → Settings → Authorized domains, then try again.`;
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a bit, then try again.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'That phone number looks invalid. Use international format, e.g. +919876543210.';
  }
  if (code === 'auth/quota-exceeded') {
    return 'SMS quota for this project is exhausted. Try again later.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phone sign-in is disabled in Firebase. Enable Phone under Authentication → Sign-in method.';
  }
  if (/reCAPTCHA Timeout/i.test(message)) {
    return 'Verification timed out. Refresh the page and try again (check your connection / ad blockers).';
  }

  // Strip the "Firebase: … (auth/…)" wrapper when present for cleaner UI.
  const cleaned = message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\s*$/i, '');
  return cleaned || 'Could not send verification code.';
}

/** Step 2 — Firebase sends the SMS OTP (E.164 phone required). */
export async function sendOtp(phoneNumberE164: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const verifier = ensureRecaptcha(recaptchaContainerId);
  try {
    return await signInWithPhoneNumber(firebaseAuth, phoneNumberE164, verifier);
  } catch (error: unknown) {
    // Clear the broken widget so the next attempt gets a clean verifier.
    try {
      verifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifiers.delete(recaptchaContainerId);
    throw new Error(formatPhoneAuthError(error));
  }
}

/**
 * Step 3 — confirm the 6-digit SMS code with Firebase, then sync the user
 * into Supabase (profile row). Supabase is the data store, not the SMS pipe.
 */
export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string,
  referralCodeEntered?: string,
): Promise<{ user: User; isNew: boolean; profile: UserProfile }> {
  const cred = await confirmation.confirm(code);
  const user = cred.user;
  const { profile, isNew, sessionToken } = await ensureUserProfile(user, referralCodeEntered);
  if (sessionToken && typeof window !== 'undefined') {
    localStorage.setItem('sparai_session_token', sessionToken);
  }
  await claimReferralIfNeeded(user);
  return { user, isNew, profile };
}

export async function ensureUserProfile(
  user: User,
  referralCodeEntered?: string,
): Promise<{ profile: UserProfile; isNew: boolean; sessionToken?: string }> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/ensure-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ referredBy: referralCodeEntered || null }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create profile.');
  const { profile, isNew, sessionToken } = await res.json();
  return { profile: profile as UserProfile, isNew: !!isNew, sessionToken };
}

export async function claimReferralIfNeeded(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  await fetch('/api/reflex/claim-referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  }).catch(() => {
    // Non-fatal — referral claiming can be retried on next login if this
    // request fails (e.g. flaky network).
  });
}

export async function saveProfileDetails(
  user: User,
  details: { displayName?: string; age?: number; profession?: string; promiseWord?: string; avatarUrl?: string },
): Promise<UserProfile | null> {
  const idToken = await user.getIdToken();
  try {
    const res = await fetch('/api/reflex/save-profile-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(details),
    });
    if (!res.ok) return null;
    const { profile } = await res.json();
    return (profile as UserProfile) || null;
  } catch {
    return null;
  }
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signOutFirebase() {
  await firebaseSignOut(firebaseAuth);
}

/** Calls the server-side referral application route. */
export async function applyReferralCode(user: User, code: string): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch('/api/reflex/apply-referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Could not apply referral code');
  }
}
