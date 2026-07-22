import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, uid, planId, isMock } = await req.json();

    if (!uid || !planId) {
      return NextResponse.json({ error: 'Missing uid or planId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
    }

    // 1. Signature Verification
    if (isMock) {
      console.log('Verifying mock payment for uid:', uid);
    } else {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment signature components' }, { status: 400 });
      }

      if (!RAZORPAY_KEY_SECRET) {
        return NextResponse.json({ error: 'Razorpay secret key is not configured on the server' }, { status: 500 });
      }

      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature verification failed' }, { status: 400 });
      }
    }

    // 2. Calculate subscription period
    const daysToAdd = planId === 'yearly' ? 365 : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysToAdd);

    // 3. Update subscription in database (Supabase)
    const { data, error } = await supabaseAdmin
      .from('reflex_profiles')
      .update({ subscription_until: expiryDate.toISOString() })
      .eq('uid', uid)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase subscription update error:', error);
      return NextResponse.json({ error: 'Failed to update subscription in database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
