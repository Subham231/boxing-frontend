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
  const onboardingData = body.onboardingData && typeof body.onboardingData === 'object' ? body.onboardingData : undefined;
  
  const rawDisplayName = body.displayName || onboardingData?.ring_name || onboardingData?.ringName;
  const rawAge = body.age !== undefined ? body.age : onboardingData?.user_metrics?.age ?? onboardingData?.age;
  const rawProfession = body.profession || onboardingData?.profession;
  const rawPromiseWord = body.promiseWord || onboardingData?.promise || onboardingData?.promiseWord || onboardingData?.promise_trigger;
  const rawAvatarUrl = body.avatarUrl || onboardingData?.avatar_url || onboardingData?.avatarUrl;

  const displayName = typeof rawDisplayName === 'string' ? rawDisplayName.trim().slice(0, 60) : undefined;
  const age = Number.isFinite(Number(rawAge)) && Number(rawAge) > 0 ? Math.max(0, Math.min(120, Math.round(Number(rawAge)))) : undefined;
  const profession = typeof rawProfession === 'string' ? rawProfession.trim().slice(0, 100) : undefined;
  const promiseWord = typeof rawPromiseWord === 'string' ? rawPromiseWord.trim().slice(0, 200) : undefined;
  const avatarUrl = typeof rawAvatarUrl === 'string' ? rawAvatarUrl.trim().slice(0, 2000) : undefined;

  const update: Record<string, unknown> = {};
  if (displayName) update.display_name = displayName;
  if (age !== undefined) update.age = age;
  if (profession) update.profession = profession;
  if (promiseWord) update.promise_word = promiseWord;
  if (avatarUrl) update.avatar_url = avatarUrl;
  if (onboardingData) update.onboarding_data = onboardingData;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ updated: false, reason: 'Nothing to update.' });
  }

  const { data, error } = await supabaseAdmin.from('reflex_profiles').update(update).eq('uid', decoded.uid).select('*').single();
  if (error) {
    return NextResponse.json({ updated: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: true, profile: data });
}
