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

  // Call claim_referral RPC or update directly to grant 30 days premium trial upon 5 referrals
  const { data, error } = await supabaseAdmin.rpc('claim_referral', { p_uid: decoded.uid });
  
  // If 5 referrals reached or newly claimed, ensure plan_expires_at is set to 30 days
  const { data: profile } = await supabaseAdmin.from('reflex_profiles').select('*').eq('uid', decoded.uid).maybeSingle();
  if (profile && profile.referral_count >= 5 && !profile.referral_bonus_5_claimed) {
    await supabaseAdmin.from('reflex_profiles').update({
      referral_bonus_5_claimed: true,
      plan: 'referral_reward',
      plan_started_at: new Date().toISOString(),
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('uid', decoded.uid);
  }

  if (error && !profile) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || { success: true });
}
