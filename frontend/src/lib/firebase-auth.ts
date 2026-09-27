import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reload,
  type ActionCodeSettings,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

export interface UserProfile {
  uid: string;
  phone: string;
  // Added by reflex-schema-v21.sql (email/password auth). Optional because
  // rows created before the migration ran may not have them yet.
  email?: string | null;
  email_verified?: boolean;
  auth_method?: 'phone' | 'email' | 'both';
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
const googleProvider = new GoogleAuthProvider();

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

/** Thrown by ensureUserProfile when the server rejects the request with a
 * machine-readable `code` (e.g. an unverified email account). Callers can
 * check `error.code` instead of parsing the message string. */
export class ProfileRequestError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ProfileRequestError';
    this.code = code;
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ProfileRequestError(err?.error || 'Could not create profile.', err?.code);
  }
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
  details: { phone?: string; displayName?: string; age?: number; profession?: string; promiseWord?: string; avatarUrl?: string; onboardingData?: Record<string, unknown> },
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

// ---------------------------------------------------------------------------
// Email / Password authentication
//
// Architecture mirrors phone auth above: Firebase Auth owns the credential
// and the verification email; Supabase (via /api/reflex/*) only stores the
// profile row keyed by the same Firebase uid. A phone-auth user who later
// adds an email keeps their existing uid — see linkEmailPasswordToUser.
// ---------------------------------------------------------------------------

/** Map Firebase email/password auth errors to something a fighter can act on. */
export function formatEmailAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Try logging in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Use Forgot password if you need to reset it.';
    case 'auth/user-not-found':
      return 'No account was found for this email. Please sign up first.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit, then try again.';
    case 'auth/requires-recent-login':
      return 'For security, please log in again before doing this.';
    case 'auth/credential-already-in-use':
      return 'This email is already linked to a different account.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    default: {
      const cleaned = message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\s*$/i, '');
      return cleaned || 'Something went wrong. Please try again.';
    }
  }
}

/** Returns the Firebase sign-in methods registered for an email address. */
export async function emailAccountExists(email: string): Promise<boolean> {
  const methods = await fetchSignInMethodsForEmail(firebaseAuth, email.trim().toLowerCase());
  return methods.length > 0;
}

/** True when the account is phone-authenticated without an email/password provider. */
export function isPhoneOnlyUser(user: User | null | undefined): user is User {
  if (!user) return false;
  const providers = user.providerData.map((provider) => provider.providerId);
  return (providers.includes('phone') || !!user.phoneNumber) && !providers.includes('password');
}

/** Build the Firebase action URL for an existing passwordless sign-in flow. */
export function getEmailLinkActionSettings(email: string, continuePath = '/dashboard'): ActionCodeSettings {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sparai.in';
  return {
    url: `${origin}/auth/finish?email=${encodeURIComponent(email.trim().toLowerCase())}&continue=${encodeURIComponent(continuePath)}`,
    handleCodeInApp: true,
  };
}

export async function sendPasswordlessSignInLink(email: string, continuePath = '/dashboard'): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await sendSignInLinkToEmail(firebaseAuth, cleanEmail, getEmailLinkActionSettings(cleanEmail, continuePath));
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('sparai_email_for_signin', cleanEmail);
    window.localStorage.setItem('sparai_email_signin_ts', Date.now().toString());
  }
}

export function isPasswordlessSignInLink(url?: string): boolean {
  const target = url || (typeof window !== 'undefined' ? window.location.href : '');
  return isSignInWithEmailLink(firebaseAuth, target);
}

export async function completePasswordlessSignIn(emailFallback?: string, url?: string): Promise<User> {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  if (!isSignInWithEmailLink(firebaseAuth, currentUrl)) {
    throw new Error('This sign-in link is invalid or has already been used.');
  }

  let email = (emailFallback || '').trim().toLowerCase();
  if (!email && typeof window !== 'undefined') {
    email = window.localStorage.getItem('sparai_email_for_signin') || '';
  }
  if (!email && typeof window !== 'undefined') {
    email = (new URLSearchParams(window.location.search).get('email') || '').trim().toLowerCase();
  }
  if (!email) throw new Error('NO_EMAIL_FOUND');

  const result = await signInWithEmailLink(firebaseAuth, email, currentUrl);
  if (typeof window !== 'undefined') window.localStorage.removeItem('sparai_email_for_signin');
  return result.user;
}

export async function loginWithGoogle(): Promise<User> {
  try {
    return (await signInWithPopup(firebaseAuth, googleProvider)).user;
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
    if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code)) {
      await signInWithRedirect(firebaseAuth, googleProvider);
      throw new Error('REDIRECT_STARTED');
    }
    throw new Error(formatGoogleAuthError(error));
  }
}

export async function checkGoogleRedirectResult(): Promise<User | null> {
  try {
    return (await getRedirectResult(firebaseAuth))?.user ?? null;
  } catch {
    return null;
  }
}

export function formatGoogleAuthError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: string }).code)
    : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Try again when ready.';
    case 'auth/popup-blocked':
      return 'Popup was blocked. Allow popups for this site or try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using another sign-in method.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    default: {
      const message = error instanceof Error ? error.message : '';
      const cleaned = message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\s*$/i, '');
      return cleaned || 'Google sign-in failed. Please try again.';
    }
  }
}

/**
 * New-user signup with email + password. Creates the Firebase account and
 * returns the (unverified) user. Does NOT send a verification email itself
 * and does NOT create the Supabase profile row yet — that only happens
 * once the email is verified (see ensureUserProfile / the /verify-email
 * page). Callers should follow this with sendEmailVerificationOtp(user).
 *
 * Verification is a 6-digit code sent via our own /api/email-auth/send-otp
 * (real transactional email API), not Firebase's built-in
 * sendEmailVerification() — Firebase's own mailer is what was causing
 * verification emails to never arrive in Gmail inboxes, and its link-based
 * flow doesn't return cleanly into an installed PWA. See
 * lib/server/email-otp.ts for details.
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return cred.user;
}

/** Sends a 6-digit email-verification code to the signed-in user's own email. */
export async function sendEmailVerificationOtp(user: User): Promise<{ ok: boolean; message?: string }> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/email-auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ purpose: 'verify' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data?.message || data?.error || 'Could not send the code.' };
  return { ok: true };
}

/**
 * Submits the 6-digit code the fighter received by email. On success,
 * flips emailVerified=true server-side (Firebase Admin) and force-refreshes
 * this client's ID token so `token.email_verified` shows true on the very
 * next protected API call (e.g. ensureUserProfile).
 */
export async function verifyEmailVerificationOtp(user: User, otp: string): Promise<{ ok: boolean; message?: string }> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/email-auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ purpose: 'verify', otp }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.verified) {
    const messages: Record<string, string> = {
      incorrect_code: 'That code is incorrect.',
      too_many_attempts: 'Too many incorrect attempts. Request a new code.',
      no_active_otp: 'That code has expired. Request a new one.',
      invalid_input: 'Enter the 6-digit code.',
    };
    return { ok: false, message: messages[data?.reason] || 'Could not verify that code.' };
  }
  await reload(user);
  await user.getIdToken(true);
  return { ok: true };
}

/** Step 1 of the forgot-password flow — sends a 6-digit reset code by email. */
export async function sendPasswordResetOtp(email: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/email-auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'reset', email: email.trim().toLowerCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data?.message || data?.error || 'Could not send the code.' };
  return { ok: true };
}

/** Step 2 of the forgot-password flow — verifies the code and sets the new password. */
export async function verifyPasswordResetOtp(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/email-auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'reset', email: email.trim().toLowerCase(), otp, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.verified) {
    const messages: Record<string, string> = {
      incorrect_code: 'That code is incorrect.',
      too_many_attempts: 'Too many incorrect attempts. Request a new code.',
      no_active_otp: 'That code has expired. Request a new one.',
      invalid_input: 'Enter the 6-digit code.',
      weak_password: 'Choose a password with at least 6 characters.',
    };
    return { ok: false, message: messages[data?.reason] || 'Could not reset your password.' };
  }
  return { ok: true };
}

/**
 * Login with email + password. Throws the raw Firebase error on bad
 * credentials — callers should run it through formatEmailAuthError. Does
 * NOT check emailVerified itself; callers decide what to do with an
 * unverified user (normally: send them to /verify-email). The backend
 * enforces verification independently on any protected route.
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return cred.user;
}

/**
 * Forces a fresh token fetch from Firebase and returns whether the email
 * is verified now. Firebase's local `user.emailVerified` is a snapshot from
 * sign-in time — it does NOT update on its own after the user clicks the
 * link in their inbox, so this reload is required before checking.
 */
export async function refreshEmailVerified(user: User): Promise<boolean> {
  await reload(user);
  // The ID token can still contain the pre-verification claim after reload.
  // Force a fresh token before protected profile APIs inspect email_verified.
  await user.getIdToken(true);
  return user.emailVerified;
}

/**
 * Migration path for existing phone-auth users: links an email/password
 * credential onto the CURRENT Firebase user without creating a new account
 * or a new uid. All existing Supabase data (keyed by uid) is untouched —
 * ensureUserProfile just adds the email onto the same profile row after
 * this succeeds. Firebase itself rejects the link if the email is already
 * used by a different account (auth/credential-already-in-use — see
 * formatEmailAuthError above). Does not send a verification code itself —
 * call sendEmailVerificationOtp(user) right after this succeeds.
 */
export async function linkEmailPasswordToUser(user: User, email: string, password: string): Promise<void> {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  await linkWithCredential(user, credential);
}
