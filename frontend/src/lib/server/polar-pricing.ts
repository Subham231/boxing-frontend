// SERVER-ONLY. Resolves what a customer in a given country will actually be
// charged for a plan, straight from the Polar product listing — so the price
// shown on the subscription page is the price Polar charges, not a number
// hard-coded in this repo that can drift from the listing.
import { PLANS, type PlanId } from './entitlements';
import { getPolarProductPrices } from './polar';
import type { CountryConfig } from './country-config';

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; prices: { currency: string; minor: number }[] }>();

async function pricesFor(productId: string) {
  const hit = cache.get(productId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prices;
  const prices = await getPolarProductPrices(productId);
  // Never cache a failure/empty result — retry on the next request.
  if (prices.length > 0) cache.set(productId, { at: Date.now(), prices });
  return hit?.prices ?? prices;
}

/** Format a minor-unit amount (cents, pence, yen...) in a currency, e.g. 699,'USD' -> "$6.99". */
export function formatMinor(minor: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
    return fmt.format(minor / 10 ** digits);
  } catch {
    return `${code} ${(minor / 100).toFixed(2)}`;
  }
}

export interface ResolvedPlanPrice {
  display: string;
  currency: string; // currency the customer will really be charged in (upper-case ISO)
  minor: number;
  /** True when Polar has a price in the customer's own currency. */
  isLocalCurrency: boolean;
  /** 'polar' = read from the live listing, 'fallback' = Polar unreachable, using the configured USD list price. */
  source: 'polar' | 'fallback';
}

export async function resolvePolarPlanPrice(planId: PlanId, countryCurrency: string): Promise<ResolvedPlanPrice> {
  const cfg = PLANS[planId];
  const want = countryCurrency.toUpperCase();
  const prices = await pricesFor(cfg.polarProductId);

  const exact = prices.find((p) => p.currency === want);
  if (exact) {
    return { display: formatMinor(exact.minor, exact.currency), currency: exact.currency, minor: exact.minor, isLocalCurrency: true, source: 'polar' };
  }
  // No price in the customer's currency: show (and charge) the USD listing.
  const usd = prices.find((p) => p.currency === 'USD') ?? prices[0];
  if (usd) {
    return { display: formatMinor(usd.minor, usd.currency), currency: usd.currency, minor: usd.minor, isLocalCurrency: usd.currency === want, source: 'polar' };
  }
  const minor = Math.round(cfg.priceUsd * 100);
  return { display: formatMinor(minor, 'USD'), currency: 'USD', minor, isLocalCurrency: want === 'USD', source: 'fallback' };
}

/** Convenience wrapper: resolve a plan's price for a resolved country config. */
export async function resolvePlanPricing(planId: PlanId, country: CountryConfig): Promise<ResolvedPlanPrice> {
  return resolvePolarPlanPrice(planId, country.currency);
}
