import { NextRequest, NextResponse } from 'next/server';
import { PLANS, type PlanId } from '@/lib/server/entitlements';
import { getPolarProductPrices, polarCheckoutConfigured, polarConfigured, polarEnvironment } from '@/lib/server/polar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/polar/health?key=<POLAR_HEALTH_KEY>
// One-call diagnosis of "payments don't work". Disabled (404) unless the
// POLAR_HEALTH_KEY env var is set and supplied; never returns secrets.
export async function GET(req: NextRequest) {
  const expected = process.env.POLAR_HEALTH_KEY || '';
  if (!expected || req.nextUrl.searchParams.get('key') !== expected) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const plans = await Promise.all(
    (Object.keys(PLANS) as PlanId[]).map(async (id) => {
      const productId = PLANS[id].polarProductId;
      const prices = await getPolarProductPrices(productId);
      return { plan: id, productId, reachable: prices.length > 0, currencies: prices.map((p) => p.currency) };
    }),
  );
  return NextResponse.json({
    environment: polarEnvironment(),
    accessTokenSet: polarCheckoutConfigured(),
    webhookSecretSet: polarConfigured(),
    plans,
    hint: 'reachable=false for every plan usually means POLAR_ENVIRONMENT does not match the token (sandbox vs production) or the token lacks products:read.',
  });
}
