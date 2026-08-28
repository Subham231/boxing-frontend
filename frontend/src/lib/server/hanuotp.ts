// SERVER-ONLY. Never import this from a 'use client' component. This is
// the single place in the codebase allowed to call the HanuOTP API — the
// API key lives only in process.env.HANUOTP_API_KEY, never a
// NEXT_PUBLIC_* variable, so it never reaches the browser bundle.
//
// Dark-launch status: this file has no callers outside
// /api/hanu-auth/send-otp. It is not wired into PhoneLoginGate.tsx or any
// live user flow yet.

// Overridable via env so phase-1 testing can point this at a mock/staging
// endpoint without touching code. Falls back to the real HanuOTP endpoint.
const HANUOTP_BASE_URL =
  process.env.HANUOTP_BASE_URL || 'https://api.hanuotp.in/sms-otp.php';

const REQUEST_TIMEOUT_MS = 10_000;

export interface HanuOtpSendResult {
  success: boolean;
  // Raw response body, kept only for server-side logging during testing —
  // never returned to the client and never logged with the phone number
  // or OTP attached.
  rawResponse?: string;
  errorMessage?: string;
}

/**
 * Every phone number elsewhere in this app is stored/passed as E.164
 * ("+919876543210" — see isValidE164 in hanu-auth.ts). HanuOTP's sample
 * only shows a placeholder ("number=mobile_number") with no format spec.
 *
 * REVISED DEFAULT: strips both the "+" and the "91" country code, sending
 * the bare 10-digit number ("9876543210"). This replaces the earlier guess
 * of keeping "91" attached. Reasoning: HanuOTP is an India-specific OTP
 * gateway (.in domain, sms-otp.php style backend), and that entire class of
 * Indian bulk-SMS/OTP providers (MSG91, Fast2SMS, TextLocal, SMSCountry,
 * etc.) almost universally expects the bare 10-digit number with no country
 * code for domestic sends — country code is implicit. This is a materially
 * more likely default than the previous one, but it is still a guess, not
 * a confirmed fact — HanuOTP's docs don't specify a format either way.
 *
 * OPEN ITEM: confirm against a real HanuOTP send during phase-1 testing.
 * If the bare 10-digit form bounces or the message doesn't arrive, try the
 * commented-out "91"-prefixed variant below — this is the only function
 * that needs to change either way.
 */
function formatPhoneForHanuOtp(phoneE164: string): string {
  const digitsOnly = phoneE164.replace(/^\+/, '');
  // Strip a leading "91" country code for standard 10-digit Indian mobile
  // numbers (12 digits total: 91 + 10-digit number).
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
  // If bare 10-digit turns out wrong, revert to:
  //   return phoneE164.replace(/^\+/, '');
}

/**
 * Sends a 6-digit OTP via HanuOTP. Treats anything other than a 2xx HTTP
 * response as a failure and does NOT activate the OTP row in that case —
 * see /api/hanu-auth/send-otp, which only commits the OTP as usable after
 * this returns { success: true }.
 *
 * TODO (open item from the integration plan): HanuOTP's success/failure
 * response body format hasn't been confirmed yet. Right now this only
 * checks the HTTP status. Once we've seen a real response during phase-1
 * testing, tighten this to also parse the body and reject a 200 that
 * actually indicates a provider-side delivery failure.
 */
export async function sendHanuOtp(
  phoneNumberE164: string,
  otp: string
): Promise<HanuOtpSendResult> {
  const apiKey = process.env.HANUOTP_API_KEY;
  if (!apiKey) {
    return { success: false, errorMessage: 'HANUOTP_API_KEY is not configured.' };
  }

  const url = new URL(HANUOTP_BASE_URL);
  url.searchParams.set('number', formatPhoneForHanuOtp(phoneNumberE164));
  url.searchParams.set('OTP', otp);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('templatesid', 'default');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { method: 'GET', signal: controller.signal });
    const rawResponse = await res.text().catch(() => '');

    if (!res.ok) {
      return { success: false, rawResponse, errorMessage: `HanuOTP HTTP ${res.status}` };
    }

    // Log only during testing — never in a way that pairs the phone number
    // or OTP with this output in production.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[hanuotp] raw response (phase-1 testing only):', rawResponse);
    }

    return { success: true, rawResponse };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      errorMessage: isTimeout
        ? 'HanuOTP request timed out.'
        : err instanceof Error
          ? err.message
          : 'HanuOTP request failed.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
