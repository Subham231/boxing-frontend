import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { requireVerifiedFirebaseUid } from '@/lib/server/require-firebase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  const auth = await requireVerifiedFirebaseUid(req);
  if ('error' in auth) return auth.error;

  // Derive identity fields from the verified Firebase token, never from the
  // request body. This keeps the Supabase profile linked to the real account.
  const email = typeof auth.token.email === 'string' ? auth.token.email.trim().toLowerCase() : '';

  const body = await req.json().catch(() => ({}));
  const onboardingData = body.onboardingData && typeof body.onboardingData === 'object' ? body.onboardingData : undefined;
  
  const rawDisplayName = body.displayName || onboardingData?.ring_name || onboardingData?.ringName;
  const rawPhone = body.phone || onboardingData?.phone_number || onboardingData?.phone;
  const rawAge = body.age !== undefined ? body.age : onboardingData?.user_metrics?.age ?? onboardingData?.age;
  const rawProfession = body.profession || onboardingData?.profession;
  const rawPromiseWord = body.promiseWord || onboardingData?.promise || onboardingData?.promiseWord || onboardingData?.promise_trigger;
  const rawAvatarUrl = body.avatarUrl || onboardingData?.avatar_url || onboardingData?.avatarUrl;

  const displayName = typeof rawDisplayName === 'string' ? rawDisplayName.trim().slice(0, 60) : undefined;
  const phone = typeof rawPhone === 'string' && /^\+[1-9]\d{7,14}$/.test(rawPhone.trim()) ? rawPhone.trim() : undefined;
  const age = Number.isFinite(Number(rawAge)) && Number(rawAge) > 0 ? Math.max(0, Math.min(120, Math.round(Number(rawAge)))) : undefined;
  const profession = typeof rawProfession === 'string' ? rawProfession.trim().slice(0, 100) : undefined;
  const promiseWord = typeof rawPromiseWord === 'string' ? rawPromiseWord.trim().slice(0, 200) : undefined;
  const avatarUrl = typeof rawAvatarUrl === 'string' ? rawAvatarUrl.trim().slice(0, 2000) : undefined;

  const update: Record<string, unknown> = {};
  if (email) {
    update.email = email;
    update.email_verified = true;
  }
  if (displayName) update.display_name = displayName;
  if (phone) update.phone = phone;
  if (age !== undefined) update.age = age;
  if (profession) update.profession = profession;
  if (promiseWord) update.promise_word = promiseWord;
  if (avatarUrl) update.avatar_url = avatarUrl;
  if (onboardingData) update.onboarding_data = onboardingData;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ updated: false, reason: 'Nothing to update.' });
  }

  const { data, error } = await supabaseAdmin
    .from('reflex_profiles')
    .update(update)
    .eq('uid', auth.uid)
    .select('*')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ updated: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    // No row matched this uid at all — this should only happen if
    // ensure-profile hasn't run yet for this account. Fail clearly instead
    // of throwing an opaque PostgREST "0 rows" error, so the client can
    // surface a real message instead of silently proceeding as if this
    // succeeded.
    return NextResponse.json(
      { updated: false, error: 'No profile found for this account yet. Please try signing up again.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ updated: true, profile: data });
}
