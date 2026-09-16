import { NextRequest, NextResponse } from 'next/server';
import { getLaunchStatus } from '@/lib/launch-status';
import { PLANS, type PlanId } from '@/lib/server/entitlements';
import { resolvePaymentProvider, resolveCountryConfig, detectCountryFromRequest } from '@/lib/server/country-config';

export const dynamic = 'force-dynamic';

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatUsdLike(symbol: string, amount: number): string {
  return `${symbol}${amount.toFixed(2)}`;
}

// GET /api/public-pricing?country=US
// Backend remains the sole source of price/provider/currency truth — the
// frontend only ever sends a country code (never an amount or provider)
// and displays exactly what comes back here. If no country is passed, the
// response still includes India's Razorpay pricing under each plan id, so
// existing callers of this route that don't pass ?country keep working
// unchanged (see app/(app)/subscription/page.tsx's original fetch).
export async function GET(req: NextRequest) {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ plans: [], country: null, provider: null }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const requestedCountry = (req.nextUrl.searchParams.get('country') || '').toUpperCase();
  const geoCountry = detectCountryFromRequest(req);
  const effectiveCountry = requestedCountry || geoCountry || 'IN';
  const countryConfig = resolveCountryConfig(effectiveCountry);
  const provider = resolvePaymentProvider(effectiveCountry);

  const plans = (Object.keys(PLANS) as PlanId[]).map((id) => {
    const cfg = PLANS[id];
    const price =
      provider === 'razorpay'
        ? formatInr(cfg.priceInPaise)
        : formatUsdLike(countryConfig.symbol, cfg.priceUsd);
    return {
      id,
      name: cfg.name,
      price,
      originalPrice: '',
      currency: provider === 'razorpay' ? 'INR' : countryConfig.currency,
      provider,
    };
  });

  return NextResponse.json(
    {
      plans,
      country: countryConfig.code,
      countryName: countryConfig.name,
      provider,
      footerText: provider === 'razorpay' ? 'Secure payment via Razorpay' : 'Secure payment via Polar',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
