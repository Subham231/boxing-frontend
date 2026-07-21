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
}

let recaptchaVerifier: RecaptchaVerifier | null = null;
let recaptchaContainerIdInUse: string | null = null;

// Must be called with the id of a visible (or invisible) container element
// already mounted in the DOM before sending an OTP. Recreates the verifier
// if a different container id is requested than the one currently cached
// (e.g. the Reflex page's gate vs. the Onboarding flow's OTP step each use
// their own container).
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier && recaptchaContainerIdInUse === containerId) return recaptchaVerifier;
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
  });
  recaptchaContainerIdInUse = containerId;
  return recaptchaVerifier;
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

export async function confirmOtp(confirmation: ConfirmationResult, code: string, referralCodeEntered?: string): Promise<User> {
  const cred = await confirmation.confirm(code);
  const user = cred.user;
  await ensureUserProfile(user, referralCodeEntered);
  await claimReferralIfNeeded(user);
  return user;
}

// Calls the server route, which verifies the Firebase ID token and
// creates/returns the Supabase profile row (with a fresh referral code on
// first login). All actual data writes happen server-side with the
// Supabase service_role key — the client never writes profile data itself.
export async function ensureUserProfile(user: User, referralCodeEntered?: string): Promise<UserProfile> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/ensure-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ referredBy: referralCodeEntered || null }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create profile.');
  const { profile } = await res.json();
  return profile as UserProfile;
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

export async function saveProfileDetails(user: User, details: { displayName?: string; age?: number; profession?: string }): Promise<void> {
  const idToken = await user.getIdToken();
  await fetch('/api/reflex/save-profile-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(details),
  }).catch(() => {
    // Non-fatal — the core account (uid + phone) already exists even if
    // these extra display fields fail to save; they can be retried later
    // from a profile/settings screen.
  });
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signOutFirebase() {
  await firebaseSignOut(firebaseAuth);
}
