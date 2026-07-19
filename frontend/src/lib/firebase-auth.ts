import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore } from './firebase';

export interface UserProfile {
  uid: string;
  phone: string;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  subscriptionUntil: string | null; // ISO date string, null = no active reward subscription
  createdAt: unknown;
}

// Generates a short, human-shareable referral code. Collision risk is low
// enough for this use case; the Cloud Function that creates the user doc
// re-checks uniqueness server-side before committing.
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

// Must be called with the id of a visible (or invisible) container element
// already mounted in the DOM before sending an OTP.
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
  });
  return recaptchaVerifier;
}

export async function sendOtp(phoneNumberE164: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const verifier = ensureRecaptcha(recaptchaContainerId);
  return signInWithPhoneNumber(firebaseAuth, phoneNumberE164, verifier);
}

export async function confirmOtp(confirmation: ConfirmationResult, code: string, referralCodeEntered?: string): Promise<User> {
  const cred = await confirmation.confirm(code);
  const user = cred.user;
  await ensureUserProfile(user, referralCodeEntered);
  return user;
}

// Creates the user's Firestore profile on their very first successful login.
// Referral linking is written here as `referredBy`, but the actual COUNT
// increment on the referrer's document happens server-side (Cloud Function
// trigger on user-doc creation) — never trust the client to increment
// someone else's counter directly, or anyone could inflate their own
// referral count by writing to arbitrary documents.
export async function ensureUserProfile(user: User, referralCodeEntered?: string): Promise<UserProfile> {
  const ref = doc(firestore, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;

  const profile: UserProfile = {
    uid: user.uid,
    phone: user.phoneNumber || '',
    referralCode: generateReferralCode(),
    referredBy: referralCodeEntered?.trim().toUpperCase() || null,
    referralCount: 0,
    subscriptionUntil: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signOutFirebase() {
  await firebaseSignOut(firebaseAuth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
