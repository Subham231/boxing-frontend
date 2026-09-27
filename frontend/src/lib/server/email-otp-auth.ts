// SERVER-ONLY. Shared helpers for the email-OTP verify/reset system. Never
// imported from a 'use client' component. Mirrors the hashing pattern in
// lib/server/hanu-auth.ts so there's one HMAC pattern in this codebase.

import { createHmac, randomInt } from 'crypto';

function getHmacSecret(): string {
  // Reuses the same secret documented in .env.hanu-auth.example — one
  // server-only 32+ byte secret for every OTP hash in this app.
  const secret = process.env.AUTH_HMAC_SECRET;
  if (!secret) {
    throw new Error('AUTH_HMAC_SECRET is not configured.');
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac('sha256', getHmacSecret()).update(value).digest('hex');
}

/** Emails and OTPs are never stored raw — only their HMAC hash. */
export function hashEmail(email: string): string {
  return hmac(`email:${email.trim().toLowerCase()}`);
}

export function hashEmailOtp(otp: string, email: string): string {
  return hmac(`otp:${email.trim().toLowerCase()}:${otp}`);
}

/** Cryptographically secure 6-digit code — never Math.random(). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function otpExpiryTimestamp(minutesFromNow = 10): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
