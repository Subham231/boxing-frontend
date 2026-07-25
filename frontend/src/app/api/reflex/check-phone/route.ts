import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ exists: false, error: 'Server not configured.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ exists: false, error: 'Invalid phone number.' }, { status: 400 });
  }

  const { data } = await supabaseAdmin.from('reflex_profiles').select('uid').eq('phone', phone).maybeSingle();
  return NextResponse.json({ exists: !!data });
}
