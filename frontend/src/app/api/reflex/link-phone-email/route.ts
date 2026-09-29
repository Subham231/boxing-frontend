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

  const email = typeof auth.token.email === 'string' ? auth.token.email.trim().toLowerCase() : '';
  if (!email || auth.token.email_verified !== true) {
    return NextResponse.json(
      { error: 'Verify your email before linking it to your fighter profile.', code: 'EMAIL_NOT_VERIFIED' },
      { status: 403 },
    );
  }

  const { data: emailOwner, error: lookupError } = await supabaseAdmin
    .from('reflex_profiles')
    .select('uid')
    .ilike('email', email)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (emailOwner && emailOwner.uid !== auth.uid) {
    return NextResponse.json(
      { error: 'This email is already linked to another fighter account.' },
      { status: 409 },
    );
  }

  const authMethod = auth.token.phone_number ? 'both' : 'email';
  const { data, error } = await supabaseAdmin
    .from('reflex_profiles')
    .update({ email, email_verified: true, auth_method: authMethod })
    .eq('uid', auth.uid)
    .select('uid,email,email_verified,auth_method')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: 'No fighter profile exists for this account yet. Complete verified signup first.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, profile: data });
}
