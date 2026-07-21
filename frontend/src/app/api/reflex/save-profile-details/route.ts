import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

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

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : undefined;
  const age = Number.isFinite(body.age) ? Math.max(0, Math.min(120, Math.round(body.age))) : undefined;
  const profession = typeof body.profession === 'string' ? body.profession.trim().slice(0, 100) : undefined;

  const update: Record<string, unknown> = {};
  if (displayName) update.display_name = displayName;
  if (age !== undefined) update.age = age;
  if (profession) update.profession = profession;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ updated: false, reason: 'Nothing to update.' });
  }

  const { error } = await supabaseAdmin.from('reflex_profiles').update(update).eq('uid', decoded.uid);
  if (error) {
    return NextResponse.json({ updated: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: true });
}
