import { NextRequest, NextResponse } from 'next/server';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin';
import { getLaunchStatus } from '@/lib/launch-status';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!getLaunchStatus().launched) return NextResponse.json({ sent: 0, launched: false });
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });

  const { data: rows, error } = await supabaseAdmin
    .from('notification_subscriptions')
    .select('uid, fcm_token')
    .not('fcm_token', 'is', null)
    .is('launch_notified_at', null)
    .limit(500);
  if (error) return NextResponse.json({ error: 'Could not load notification subscriptions.' }, { status: 500 });

  const tokens = (rows || []).map((row) => row.fcm_token).filter((token): token is string => Boolean(token));
  if (!tokens.length) return NextResponse.json({ sent: 0, launched: true });

  const response = await getMessaging(getFirebaseAdminApp()).sendEachForMulticast({
    tokens,
    notification: {
      title: 'SparAI is now live',
      body: 'Your AI boxing coach is ready. Start your first training session.',
    },
    data: { url: '/dashboard' },
  });
  const sentUids = (rows || []).filter((row) => row.fcm_token && !response.responses[tokens.indexOf(row.fcm_token)].error).map((row) => row.uid);
  if (sentUids.length) {
    await supabaseAdmin.from('notification_subscriptions').update({ launch_notified_at: new Date().toISOString() }).in('uid', sentUids);
  }
  return NextResponse.json({ sent: response.successCount, failed: response.failureCount, launched: true });
}
