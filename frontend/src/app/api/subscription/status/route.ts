import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { getEntitlement } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace('Bearer ', '');
  if (!idToken) {
    return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  // Always computed fresh from Supabase — this is the check that runs on
  // every login and app launch. The client never gets to assert its own
  // subscription state; it only ever receives what this route computes.
  const entitlement = await getEntitlement(decoded.uid);
  return NextResponse.json(entitlement);
}
