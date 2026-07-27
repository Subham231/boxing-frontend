import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

const ADMIN_OTP = '999999';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.replace('Bearer ', '') !== ADMIN_OTP) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid param' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reflex_profiles')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Fighter not found' }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}
