// SERVER-ONLY. Never import this from a 'use client' component. This is
// the single place in the codebase that sends password-reset OTP email — swap the
// implementation here if you use a different provider than Resend, nothing
// else in the app needs to change (same isolation pattern as hanuotp.ts).
//
// Uses Resend's plain HTTP API directly (no SDK dependency needed).
// Requires:
//   RESEND_API_KEY     — from https://resend.com/api-keys
//   RESEND_FROM_EMAIL   — a sender address on a domain you've verified in
//                         Resend (Domains tab). Until a domain is verified,
//                         Resend only lets you send to your own account
//                         email from onboarding@resend.dev — fine for
//                         testing, not for real users.

const RESEND_API_URL = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

export interface EmailSendResult {
  success: boolean;
  errorMessage?: string;
}

function otpEmailHtml(otp: string): string {
  const heading = 'Reset your password';
  const body = 'Use this code to reset your SPARAI password. It expires in 10 minutes.';
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 8px;">${heading}</h2>
      <p style="color: #555; font-size: 14px; line-height: 1.5;">${body}</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; text-align: center; padding: 20px 0; color: #111;">${otp}</div>
      <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `.trim();
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return { success: false, errorMessage: 'RESEND_API_KEY / RESEND_FROM_EMAIL not configured.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'Your SPARAI password reset code',
        html: otpEmailHtml(otp),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const rawBody = await res.text().catch(() => '');
      return { success: false, errorMessage: `Resend HTTP ${res.status}: ${rawBody}` };
    }

    return { success: true };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      errorMessage: isTimeout ? 'Resend request timed out.' : err instanceof Error ? err.message : 'Resend request failed.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
