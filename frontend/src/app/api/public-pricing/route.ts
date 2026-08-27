import { NextResponse } from 'next/server';
import { getLaunchStatus } from '@/lib/launch-status';
import { PLANS, type PlanId } from '@/lib/server/entitlements';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!getLaunchStatus().launched) {
    return NextResponse.json({ plans: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const plans = (Object.keys(PLANS) as PlanId[]).map((id) => ({
    id,
    name: PLANS[id].name,
    price: `₹${(PLANS[id].priceInPaise / 100).toLocaleString('en-IN')}`,
  }));
  return NextResponse.json({ plans }, { headers: { 'Cache-Control': 'no-store' } });
}
