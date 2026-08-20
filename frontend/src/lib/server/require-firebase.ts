import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';

export async function requireFirebaseUid(req: NextRequest): Promise<
  { uid: string; token: any } | { error: NextResponse }
> {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    return { error: NextResponse.json({ error: 'Missing auth token.' }, { status: 401 }) };
  }
  try {
    const token = await verifyFirebaseIdToken(idToken);
    return { uid: token.uid, token };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 }) };
  }
}
