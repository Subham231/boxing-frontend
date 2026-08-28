import { NextResponse } from 'next/server';
import { getLaunchStatus } from '@/lib/launch-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getLaunchStatus(), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
