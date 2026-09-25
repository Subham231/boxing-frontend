import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
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
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ProfileRequestError';
    this.code = code;
    this.status = status;
  }
}

export async function ensureUserProfile(
  user: User,
  referralCodeEntered?: string,
): Promise<{ profile: UserProfile; isNew: boolean; sessionToken?: string }> {
  // One retry on a transient (network / 5xx) failure. Business errors such as
  // 403 EMAIL_NOT_VERIFIED or 409 conflicts are returned immediately.
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/reflex/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ referredBy: referralCodeEntered || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const failure = new ProfileRequestError(err?.error || 'Could not create profile.', err?.code, res.status);
        if (res.status >= 500 && attempt === 0) {
          lastError = failure;
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        throw failure;
      }
      const { profile, isNew, sessionToken } = await res.json();
      return { profile: profile as UserProfile, isNew: !!isNew, sessionToken };
    } catch (e) {
      if (e instanceof ProfileRequestError) throw e;
      lastError = e;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new ProfileRequestError('Could not create profile.');
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
    case 'auth/invalid-action-code':
      return 'This sign-in link has expired or has already been used. Please request a new link.';
    case 'auth/expired-action-code':
      return 'This sign-in link has expired. Please request a new one.';
    case 'auth/operation-not-allowed':
      return 'Email link sign-in is not enabled. Please check Firebase Authentication settings.';
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
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    case 'auth/provider-already-linked':
      return 'This account already has an email login.';
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

/** True when this Firebase user signed up with a phone number and has no email yet. */
export function isPhoneOnlyUser(user: User | null | undefined): user is User {
  if (!user) return false;
  const providers = user.providerData.map((p) => p.providerId);
  const hasPhone = providers.includes('phone') || !!user.phoneNumber;
  const hasPassword = providers.includes('password');
  return hasPhone && !hasPassword;
}

/** Where the passwordless magic link returns the fighter back to */
export function getEmailLinkActionSettings(email: string, continuePath: string = '/dashboard'): ActionCodeSettings {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sparai.in';
  return {
    url: `${origin}/auth/finish?email=${encodeURIComponent(email.trim().toLowerCase())}&continue=${encodeURIComponent(continuePath)}`,
    handleCodeInApp: true,
  };
}

/**
 * Sends a passwordless sign-in magic link to the fighter's email.
 * Clicking the link authenticates the user directly and verifies their email.
 */
export async function sendPasswordlessSignInLink(email: string, continuePath: string = '/dashboard'): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const settings = getEmailLinkActionSettings(cleanEmail, continuePath);
  await sendSignInLinkToEmail(firebaseAuth, cleanEmail, settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('sparai_email_for_signin', cleanEmail);
    window.localStorage.setItem('sparai_email_signin_ts', Date.now().toString());
  }
}

/**
 * Checks whether the current URL contains a valid Firebase sign-in link.
 */
export function isPasswordlessSignInLink(url?: string): boolean {
  const target = url || (typeof window !== 'undefined' ? window.location.href : '');
  return isSignInWithEmailLink(firebaseAuth, target);
}

/**
 * Completes sign-in with the incoming magic link.
 * Resolves email from local storage, URL params, or the provided fallback.
 */
export async function completePasswordlessSignIn(emailFallback?: string, url?: string): Promise<User> {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  if (!isSignInWithEmailLink(firebaseAuth, currentUrl)) {
    throw new Error('This sign-in link is invalid or has already been used.');
  }

  let emailToUse = (emailFallback || '').trim().toLowerCase();
  if (!emailToUse && typeof window !== 'undefined') {
    emailToUse = window.localStorage.getItem('sparai_email_for_signin') || '';
  }
  if (!emailToUse && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    emailToUse = (params.get('email') || '').trim().toLowerCase();
  }

  if (!emailToUse) {
    throw new Error('NO_EMAIL_FOUND');
  }

  const result = await signInWithEmailLink(firebaseAuth, emailToUse, currentUrl);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('sparai_email_for_signin');
  }
  return result.user;
}

/** Where the verification link should send the fighter back to. */
function verificationActionSettings(): ActionCodeSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  return { url: `${window.location.origin}/verify-email?verified=1` };
}

/**
 * Sends the Firebase verification email.
 */
export async function sendVerificationEmailSafe(user: User): Promise<void> {
  const settings = verificationActionSettings();
  if (settings) {
    try {
      await sendEmailVerification(user, settings);
      return;
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      if (code !== 'auth/unauthorized-continue-uri' && code !== 'auth/invalid-continue-uri' && code !== 'auth/missing-continue-uri') {
        throw e;
      }
    }
  }
  await sendEmailVerification(user);
}

/**
 * New-user signup with email + password (legacy fallback).
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const current = firebaseAuth.currentUser;
  if (isPhoneOnlyUser(current)) {
    await linkEmailPasswordToUser(current, email, password);
    return current;
  }
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  await sendVerificationEmailSafe(cred.user);
  return cred.user;
}

/**
 * Login with email + password (legacy fallback).
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return cred.user;
}

/** Re-sends the verification email to the currently signed-in user. */
export async function resendVerificationEmail(user: User): Promise<void> {
  await sendVerificationEmailSafe(user);
}

/**
 * Forces a fresh token fetch from Firebase and returns whether the email is verified now.
 */
export async function refreshEmailVerified(user: User): Promise<boolean> {
  const live = firebaseAuth.currentUser && firebaseAuth.currentUser.uid === user.uid ? firebaseAuth.currentUser : user;
  await reload(live);
  if (live.emailVerified) {
    await live.getIdToken(true);
  }
  return live.emailVerified;
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

/**
 * Migration path for existing phone-auth users: links an email/password credential.
 */
export async function linkEmailPasswordToUser(user: User, email: string, password: string): Promise<void> {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  await linkWithCredential(user, credential);
  await sendVerificationEmailSafe(user);
}
