// SERVER-ONLY. Shared helpers for the HanuOTP dark-launched auth system —
// used by /api/hanu-auth/* routes only. Nothing here is imported from a
// 'use client' component.
//
// Dark-launch status: not wired into PhoneLoginGate.tsx or any live route
// yet. See /hanuotp-integration-plan.md for the full rollout plan.

import { createHmac, randomBytes, randomInt } from 'crypto';

const SESSION_COOKIE_NAME = 'sparai_hanu_session';
const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getHmacSecret(): string {
  const secret = process.env.AUTH_HMAC_SECRET;
  if (!secret) {
    // Fail loudly rather than silently hashing with a weak/empty key.
    throw new Error('AUTH_HMAC_SECRET is not configured.');
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac('sha256', getHmacSecret()).update(value).digest('hex');
}

/** Phone numbers and OTPs are never stored raw — only their HMAC hash. */
export function hashPhone(phoneE164: string): string {
  return hmac(`phone:${phoneE164}`);
}

export function hashOtp(otp: string, phoneE164: string): string {
  // Bind the hash to the phone number too, so the same 6-digit code for two
  // different phones never produces the same stored hash.
  return hmac(`otp:${phoneE164}:${otp}`);
}

export function hashSessionToken(token: string): string {
  return hmac(`session:${token}`);
}

/** Cryptographically secure 6-digit code — never Math.random(). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Cryptographically secure 256-bit session token (raw value goes in the cookie). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * uid for a brand-new HanuOTP-authenticated user. Prefixed so it can never
 * collide with a Firebase uid (Firebase uids don't contain '_'), and so
 * every existing table keyed on reflex_profiles.uid (reflex_scores,
 * subscriptions, referrals, planner, streaks) keeps working with zero
 * schema changes.
 */
export function generateHanuUid(): string {
  return `ho_${randomBytes(16).toString('hex')}`;
}

export function otpExpiryTimestamp(minutesFromNow = 5): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

export function sessionExpiryTimestamp(): string {
  return new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000).toISOString();
}

/** Basic E.164 sanity check — same pattern already used in PhoneLoginGate/check-phone. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export const HANU_SESSION_COOKIE = {
  name: SESSION_COOKIE_NAME,
  maxAgeSeconds: SESSION_LIFETIME_SECONDS,
} as const;
