import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_abandoned_spar_matches');

    if (error) {
      console.error('[spar/cleanup] Error:', error);
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    console.error('[spar/cleanup] Unexpected error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}