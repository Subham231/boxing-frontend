import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('spar_leaderboard')
    .select('uid, display_name, wins, losses, updated_at')
    .order('wins', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ rows: [], note: 'Leaderboard unavailable until migration v14 is applied.' });
  }

  return NextResponse.json({ rows: data || [] });
}
