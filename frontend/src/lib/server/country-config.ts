// SERVER-ONLY. Single source of truth for country → currency → payment
// provider routing. Nothing here trusts a value the client sends — the
// checkout API re-resolves the provider from the country itself, and the
// country used for actual routing decisions comes from a server-side
// signal (deployment geo header) whenever one is available.
import { NextRequest } from 'next/server';

export type PaymentProvider = 'razorpay' | 'polar';

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  provider: PaymentProvider;
}

// India is the only Razorpay country. Every other country in this list is
// Polar — this list exists for display purposes (name/currency/symbol in
// the country selector), not to gate which countries are "allowed"; any
// unlisted country code still safely resolves to Polar/USD via the
// fallback in resolveCountryConfig below.
export const COUNTRIES: CountryConfig[] = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', provider: 'razorpay' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', provider: 'polar' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', provider: 'polar' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', provider: 'polar' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', provider: 'polar' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'CA$', provider: 'polar' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', provider: 'polar' },
];

const DEFAULT_NON_INDIA: CountryConfig = {
  code: 'US',
  name: 'International',
  currency: 'USD',
  symbol: '$',
  provider: 'polar',
};

const COUNTRY_MAP: Record<string, CountryConfig> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

/**
 * The only function that decides Razorpay vs Polar. India → Razorpay,
 * every other country → Polar. This is intentionally the single choke
 * point — checkout, webhook routing, and cancellation all import this
 * instead of re-deriving the same rule.
 */
export function resolvePaymentProvider(countryCode: string | null | undefined): PaymentProvider {
  return (countryCode || '').toUpperCase() === 'IN' ? 'razorpay' : 'polar';
}

export function resolveCountryConfig(countryCode: string | null | undefined): CountryConfig {
  const code = (countryCode || '').toUpperCase();
  if (COUNTRY_MAP[code]) return COUNTRY_MAP[code];
  if (code === 'IN') return COUNTRY_MAP['IN'];
  // Unlisted country: still Polar, just without a curated currency —
  // Polar itself decides the actual checkout currency/localization at
  // checkout time (see lib/server/polar.ts); this is only for display.
  return { ...DEFAULT_NON_INDIA, code: code || 'US' };
}

/**
 * Server-side country detection. Deployment geo headers (Vercel/Cloudflare)
 * are authoritative when present; everything else is a display-only
 * fallback. This value is used for the DEFAULT the UI shows on load — the
 * user can still switch the selector, but the actual payment route taken
 * is re-validated server-side against the country sent to /api/polar/checkout
 * or /api/subscription/create-order, never trusted blindly (see checkout
 * routes: they re-run resolvePaymentProvider themselves).
 */
export function detectCountryFromRequest(req: NextRequest): string {
  const vercelCountry = req.headers.get('x-vercel-ip-country');
  if (vercelCountry) return vercelCountry.toUpperCase();

  const cfCountry = req.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') return cfCountry.toUpperCase();

  // Some proxies/CDNs forward this generic header name.
  const generic = req.headers.get('x-country-code');
  if (generic) return generic.toUpperCase();

  return ''; // no server-side geo signal available (e.g. local dev/non-edge host)
}

/**
 * Anti-abuse check used only by the checkout routes. A missing/blank geo
 * signal means "we genuinely don't know" and the client-declared country is
 * trusted (there's nothing more authoritative to check it against). A geo
 * signal that confidently disagrees — specifically, the request is NOT
 * physically from India but the client is asking for the India/Razorpay
 * path — is blocked, since that's the direction that actually matters
 * (routing a non-Indian transaction through Razorpay's INR pricing).
 * The reverse (physically in India, requesting Polar/USD) is allowed
 * without friction — someone travelling or simply preferring to pay in a
 * foreign currency isn't a fraud case worth blocking.
 */
export function isSuspiciousCountryClaim(geoCountry: string, clientCountry: string): boolean {
  if (!geoCountry) return false;
  const claimsIndia = (clientCountry || '').toUpperCase() === 'IN';
  const geoIsIndia = geoCountry.toUpperCase() === 'IN';
  return claimsIndia && !geoIsIndia;
}
