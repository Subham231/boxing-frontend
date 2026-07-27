// ═══════════════════════════════════════════════════════════════════════════
// Admin overlay — replaces the OTP login flow when the secret admin code is
// entered. Shows a management panel for setting any phone's plan and usage.
//
// The admin "OTP" is:  999999
// It is hardcoded here (server-side only) so no Firebase token cost or env
// var setup is needed. Change the value below if you want a different code.
//
// HOW IT WORKS
// 1. User enters phone + OTP on the regular login page.
// 2. If phone matches a test number OR OTP equals the admin code, the
//    client calls THIS route instead of Firebase.
// 3. This route returns a signed Firebase custom token + the admin's own
//    Firebase UID. The client uses signInWithCustomToken() to log in.
// 4. For the test phone (8010050070 / 000000), additionally grants yearly
//    plan automatically so the account works without a subscription.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { initializeApp, cert } from 'firebase-admin/app';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

// Admin phone and OTP — enter +918285937242 with OTP 999999 on the login
// page to access the admin panel.
const ADMIN_PHONE = '+918285937242';
const ADMIN_OTP = '999999';

// Test phone — enters with OTP 000000 and gets yearly plan auto-granted.
const TEST_PHONE = '+918010050070';
const TEST_OTP = '000000';

function getAdminAuth() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing');
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getAuth();
}

export async function POST(req: NextRequest) {
  const { phone, otp } = await req.json().catch(() => ({}));
  if (!phone || !otp) {
    return NextResponse.json({ error: 'Missing phone or otp' }, { status: 400 });
  }

  const trimmedPhone = phone.trim();
  const trimmedOtp = String(otp).trim();

  const isTestPhone = trimmedPhone === TEST_PHONE && trimmedOtp === TEST_OTP;
  const isAdminBypass = trimmedPhone === ADMIN_PHONE && trimmedOtp === ADMIN_OTP;

  if (!isTestPhone && !isAdminBypass) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // We use a deterministic UID derived from the phone so the same number
  // always maps to the same profile row.
  const uid = `admin_${trimmedPhone.replace(/\D/g, '')}`;

  // Ensure a profile row exists.
  if (supabaseAdmin) {
    const { data: existing } = await supabaseAdmin
      .from('reflex_profiles')
      .select('uid')
      .eq('uid', uid)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('reflex_profiles').insert({
        uid,
        phone: trimmedPhone,
        referral_code: `REF${uid.slice(-6).toUpperCase()}`,
        subscription_until: null,
      });
    }

    // For the test phone, auto-grant yearly plan.
    if (isTestPhone) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await supabaseAdmin.from('reflex_profiles').update({
        plan: 'yearly',
        plan_started_at: new Date().toISOString(),
        plan_expires_at: expiresAt.toISOString(),
        is_elite: true,
        daily_analysis_count: 0,
        daily_analysis_date: null,
        weekly_planner_count: 0,
        weekly_planner_week: null,
      }).eq('uid', uid);
    }
  }

  // Mint a Firebase custom token so the client can sign in seamlessly.
  let customToken: string;
  try {
    customToken = await getAdminAuth().createCustomToken(uid);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create auth token' }, { status: 500 });
  }

  return NextResponse.json({
    customToken,
    uid,
    isTestPhone,
    isAdmin: isAdminBypass,
    // Return the full onboarding data so the client can set localStorage
    // and skip straight to dashboard.
    profile: {
      uid,
      phone: trimmedPhone,
      display_name: isTestPhone ? 'TEST FIGHTER' : 'ADMIN',
      plan: isTestPhone ? 'yearly' : null,
      plan_expires_at: isTestPhone
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    },
  });
}

// ─── Admin grant route (separate — callable from the admin panel) ────────

export async function PUT(req: NextRequest) {
  // Same admin guard: headers must include the admin secret.
  const authHeader = req.headers.get('authorization') || '';
  const adminSecret = authHeader.replace('Bearer ', '');
  if (adminSecret !== ADMIN_OTP) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { targetUid, plan, dailyAnalysisLimit, weeklyPlannerLimit } = body;

  if (!targetUid || !plan) {
    return NextResponse.json({ error: 'Missing targetUid or plan' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const validPlans = ['monthly', 'monthly_pro', 'three_month', 'yearly'];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Calculate expiry based on plan.
  const planDurations: Record<string, number> = {
    monthly: 30,
    monthly_pro: 30,
    three_month: 90,
    yearly: 365,
  };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + planDurations[plan]);

  const update: Record<string, unknown> = {
    plan,
    plan_started_at: new Date().toISOString(),
    plan_expires_at: expiresAt.toISOString(),
    is_elite: plan === 'yearly',
    daily_analysis_count: 0,
    daily_analysis_date: null,
    weekly_planner_count: 0,
    weekly_planner_week: null,
  };

  if (dailyAnalysisLimit !== undefined) {
    // Store custom limits in onboarding_data for reference.
    const { data: existing } = await supabaseAdmin
      .from('reflex_profiles')
      .select('onboarding_data')
      .eq('uid', targetUid)
      .maybeSingle();
    const customLimits = {
      ...((existing?.onboarding_data as Record<string, unknown>) || {}),
      _admin_custom_daily_limit: dailyAnalysisLimit,
      _admin_custom_weekly_limit: weeklyPlannerLimit,
    };
    update.onboarding_data = customLimits;
  }

  const { error } = await supabaseAdmin
    .from('reflex_profiles')
    .update(update)
    .eq('uid', targetUid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ granted: true, plan, expiresAt: expiresAt.toISOString() });
}
