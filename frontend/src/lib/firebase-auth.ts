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

// Must be called with the id of a visible (or invisible) container element
// already mounted in the DOM before sending an OTP.
//
// A verifier is recreated FRESH every call, even for the same container id.
// Reusing a RecaptchaVerifier across multiple send attempts (or letting one
// container's clear() reach across into a different, already-unmounted
// container from another part of the app) is exactly what causes
// "reCAPTCHA client element has been removed" and other corrupted-widget
// errors that can go on to break every subsequent send. Keying by
// container id (rather than one shared module-level slot) also means
// separate features — e.g. the onboarding OTP step vs. the Reflex page's
// login gate — can never tear down each other's verifier.
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
  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
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

export async function sendOtp(phoneNumberE164: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const verifier = ensureRecaptcha(recaptchaContainerId);
  return signInWithPhoneNumber(firebaseAuth, phoneNumberE164, verifier);
}

export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string,
  referralCodeEntered?: string,
): Promise<{ user: User; isNew: boolean; profile: UserProfile }> {
  const cred = await confirmation.confirm(code);
  const user = cred.user;
  const { profile, isNew } = await ensureUserProfile(user, referralCodeEntered);
  await claimReferralIfNeeded(user);
  return { user, isNew, profile };
}

export async function ensureUserProfile(
  user: User,
  referralCodeEntered?: string,
): Promise<{ profile: UserProfile; isNew: boolean }> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/ensure-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ referredBy: referralCodeEntered || null }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create profile.');
  const { profile, isNew } = await res.json();
  return { profile: profile as UserProfile, isNew: !!isNew };
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
