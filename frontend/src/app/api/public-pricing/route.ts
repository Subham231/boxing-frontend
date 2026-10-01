import { NextRequest, NextResponse } from 'next/server';
import { getLaunchStatus } from '@/lib/launch-status';
import { PLANS, type PlanId } from '@/lib/server/entitlements';
import { resolvePaymentProvider, resolveCountryConfig, detectCountryFromRequest } from '@/lib/server/country-config';
import { resolvePolarPlanPrice } from '@/lib/server/polar-pricing';

export const dynamic = 'force-dynamic';

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// GET /api/public-pricing?country=US
// The frontend only sends a country code. India -> Razorpay INR prices.
// Everywhere else -> the Polar product listing: the price in the country's
// own currency when the listing has one, otherwise the USD listing price
// (which is exactly what Polar will charge, and is what the US sees).
export async function GET(req: NextRequest) {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ plans: [], country: null, provider: null }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const requestedCountry = (req.nextUrl.searchParams.get('country') || '').toUpperCase();
  const geoCountry = detectCountryFromRequest(req);
  const effectiveCountry = requestedCountry || geoCountry || 'IN';
  const countryConfig = resolveCountryConfig(effectiveCountry);
  const provider = resolvePaymentProvider(effectiveCountry);
  const ids = Object.keys(PLANS) as PlanId[];

  let plans: { id: PlanId; name: string; price: string; originalPrice: string; currency: string; provider: string; localCurrency: boolean; note: string | null }[];
  if (provider === 'razorpay') {
    plans = ids.map((id) => ({
      id,
      name: PLANS[id].name,
      price: formatInr(PLANS[id].priceInPaise),
      originalPrice: '',
      currency: 'INR',
      provider,
      localCurrency: true,
      note: null,
    }));
  } else {
    const resolved = await Promise.all(ids.map((id) => resolvePolarPlanPrice(id, countryConfig.currency)));
    plans = ids.map((id, i) => ({
      id,
      name: PLANS[id].name,
      price: resolved[i].display,
      originalPrice: '',
      currency: resolved[i].currency,
      provider,
      localCurrency: resolved[i].isLocalCurrency,
      // Shown under the price when Polar has no listing in the customer's own
      // currency, so nobody is surprised by the currency on the checkout page.
      note:
        resolved[i].currency !== countryConfig.currency
          ? `Charged in ${resolved[i].currency}; your bank converts at its own rate.`
          : null,
    }));
  }

  const chargedCurrency = plans[0]?.currency || countryConfig.currency;
  const currencyNote =
    provider === 'polar' && chargedCurrency !== countryConfig.currency
      ? `Prices for ${countryConfig.name} are shown and charged in ${chargedCurrency}. Your bank converts at its own rate.`
      : null;

  return NextResponse.json(
    {
      plans,
      country: countryConfig.code,
      geoCountry,
      countryName: countryConfig.name,
      currency: chargedCurrency,
      currencyNote,
      provider,
      footerText: provider === 'razorpay' ? 'Secure payment via Razorpay' : 'Secure payment via Polar',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
