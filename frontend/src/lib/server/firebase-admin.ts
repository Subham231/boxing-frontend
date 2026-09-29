// SERVER-ONLY. Never import this from a 'use client' component — it uses
// the Firebase service account, which must never reach the browser bundle.
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is missing. See Firebase setup notes.');
  }
  // Accept either a raw JSON string or a base64-encoded one (base64 is
  // easier to paste into most hosting providers' env var UIs without
  // whitespace/quote-escaping issues).
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(json);

  adminApp = initializeApp({ credential: cert(serviceAccount) });
  return adminApp;
}

// Verifies a Firebase ID token sent from the client (Authorization: Bearer
// <token> header) and returns the decoded claims, including uid and
// phone_number. Throws if the token is invalid/expired/tampered with.
export async function verifyFirebaseIdToken(idToken: string) {
  const auth = getAuth(getFirebaseAdminApp());
  const token = await auth.verifyIdToken(idToken);
  const provider = token.firebase?.sign_in_provider;
  // Never let an unverified email identity reach any API that can persist data.
  if ((provider === 'emailLink' || provider === 'password') && token.email_verified !== true) {
    const error = new Error('EMAIL_NOT_VERIFIED');
    error.name = 'EMAIL_NOT_VERIFIED';
    throw error;
  }
  return token;
}

/** Looks up a Firebase user by email. Returns null if none exists (never throws on not-found). */
export async function getFirebaseUserByEmail(email: string) {
  const auth = getAuth(getFirebaseAdminApp());
  try {
    return await auth.getUserByEmail(email);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/user-not-found') return null;
    throw err;
  }
}

/** Sets a new password for a user after a successful password-reset email-OTP check. */
export async function setFirebaseUserPassword(uid: string, newPassword: string): Promise<void> {
  const auth = getAuth(getFirebaseAdminApp());
  await auth.updateUser(uid, { password: newPassword });
}
