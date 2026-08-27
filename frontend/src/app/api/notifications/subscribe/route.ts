import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUid } from '@/lib/server/require-firebase';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUid(req);
  if ('error' in auth) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });

  const subscription = await req.json().catch(() => null);
  if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.keys) {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('notification_subscriptions').upsert(
    { uid: auth.uid, push_subscription: subscription, updated_at: new Date().toISOString() },
    { onConflict: 'uid' },
  );
  if (error) {
    console.error('[notifications/subscribe]', error);
    return NextResponse.json({ error: 'Could not save notification permission.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
