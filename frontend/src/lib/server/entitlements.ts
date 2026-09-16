// SERVER-ONLY. This is the single source of truth for "is this account
// allowed to do X premium thing right now" — every protected route imports
// from here instead of re-deriving plan logic itself. Nothing in here ever
// reads a value the client sent about its own subscription status; it only
// ever reads reflex_profiles rows via the service-role Supabase client.
import { supabaseAdmin } from './supabase-admin';

export type PlanId = 'monthly' | 'monthly_pro' | 'three_month' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceInPaise: number; // authoritative price — the client price is never trusted
  durationDays: number;
  dailyAnalysisLimit: number; // -1 = unlimited
  weeklyPlannerLimit: number; // -1 = unlimited
  sparDailyLimit: number; // -1 = unlimited
  isElite: boolean;
  premiumGuru: boolean;
  razorpayPlanId: string;
  // Polar (international, non-India) production product id + list price.
  // Internal plan ids (monthly/monthly_pro/three_month/yearly) are never
  // replaced by these — this is purely a lookup so checkout/webhook code
  // can map Polar's product id back to the same PlanConfig Razorpay uses.
  polarProductId: string;
  priceUsd: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'SparAI Monthly',
    priceInPaise: 62900, // ₹629
    durationDays: 30,
    dailyAnalysisLimit: 1,
    weeklyPlannerLimit: 1,
    sparDailyLimit: 1,
    isElite: false,
    premiumGuru: false,
    razorpayPlanId: process.env.RAZORPAY_PLAN_MONTHLY || 'plan_TOsvYdmDfSjY6J',
    polarProductId: process.env.POLAR_PRODUCT_MONTHLY || '328ece7e-db19-4f53-b735-b1a52a671b40',
    priceUsd: 6.99,
  },
  monthly_pro: {
    id: 'monthly_pro',
    name: 'SparAI Pro',
    priceInPaise: 72900, // ₹729
    durationDays: 30,
    dailyAnalysisLimit: 2,
    weeklyPlannerLimit: 2,
    sparDailyLimit: 2,
    isElite: false,
    premiumGuru: false,
    razorpayPlanId: process.env.RAZORPAY_PLAN_MONTHLY_PRO || 'plan_TOsxtFg2g3y72B',
    polarProductId: process.env.POLAR_PRODUCT_MONTHLY_PRO || '7310fdcc-5f12-44f3-933d-f94ca81901cb',
    priceUsd: 7.69,
  },
  three_month: {
    id: 'three_month',
    name: 'SparAI Performance — 3 Months',
    priceInPaise: 162900, // ₹1,629
    durationDays: 90,
    dailyAnalysisLimit: 3,
    weeklyPlannerLimit: 3,
    sparDailyLimit: 3,
    isElite: false,
    premiumGuru: false,
    razorpayPlanId: process.env.RAZORPAY_PLAN_THREE_MONTH || 'plan_TOsyUPX0CJPHaN',
    polarProductId: process.env.POLAR_PRODUCT_THREE_MONTH || 'be5d8d7b-80a8-41ff-8c53-5ceab93b7860',
    priceUsd: 17.99,
  },
  yearly: {
    id: 'yearly',
    name: 'SparAI Elite — Yearly',
    priceInPaise: 629000, // ₹6,290
    durationDays: 365,
    dailyAnalysisLimit: -1,
    weeklyPlannerLimit: -1,
    sparDailyLimit: -1,
    isElite: true,
    premiumGuru: true,
    razorpayPlanId: process.env.RAZORPAY_PLAN_YEARLY || 'plan_TOszduZM7Q3GMC',
    polarProductId: process.env.POLAR_PRODUCT_YEARLY || '402ff207-0224-4b0d-b8a7-f0d59e01ad88',
    priceUsd: 64.99,
  },
};

export function planIdFromPolarProductId(productId: string | undefined | null): PlanId | null {
  if (!productId) return null;
  for (const [key, cfg] of Object.entries(PLANS)) {
    if (cfg.polarProductId === productId) return key as PlanId;
  }
  return null;
}

// The referral reward isn't a purchasable plan, but it needs limits too —
// treated as equivalent to the base Monthly tier's daily/weekly allowance,
// not Elite (spec doesn't say the free reward includes Elite/Guru perks).
const REFERRAL_REWARD_LIMITS = {
  dailyAnalysisLimit: 1,
  weeklyPlannerLimit: 1,
  sparDailyLimit: 1,
  isElite: false,
  premiumGuru: false,
};

export interface Entitlement {
  active: boolean;
  plan: PlanId | 'referral_reward' | null;
  planName: string;
  expiresAt: string | null;
  isElite: boolean;
  premiumGuru: boolean;
  dailyAnalysisLimit: number;
  weeklyPlannerLimit: number;
  sparDailyLimit: number;
  dailyAnalysisUsed: number;
  weeklyPlannerUsed: number;
  sparDailyUsed: number;
  freeSparAvailable: boolean;
  freeSparUnlocked: boolean;
  wasSubscribed: boolean;
  hasPurchasedPlan: boolean;
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function todayDateStr(): string {
  // Returns current calendar date in India Standard Time (IST, Asia/Kolkata), resetting at 12:00 AM midnight IST
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function currentIsoWeek(): string {
  // Compute ISO week string based on IST date
  const istDateStr = todayDateStr(); // YYYY-MM-DD
  const [year, month, day] = istDateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return isoWeek(d);
}

// Computes the account's current entitlement fresh from Supabase every
// single call — no caching, no trusting a previous result, no trusting
// anything the client sends. This is what "validated on every login, on
// app launch, before every AI analysis, before every planner generation,
// before Guru premium content" all resolve to under the hood.
export async function getEntitlement(uid: string): Promise<Entitlement> {
  const empty: Entitlement = {
    active: false,
    plan: null,
    planName: 'No subscription',
    expiresAt: null,
    isElite: false,
    premiumGuru: false,
    dailyAnalysisLimit: 0,
    weeklyPlannerLimit: 0,
    sparDailyLimit: 0,
    dailyAnalysisUsed: 0,
    weeklyPlannerUsed: 0,
    sparDailyUsed: 0,
    freeSparAvailable: false,
    freeSparUnlocked: false,
    wasSubscribed: false,
    hasPurchasedPlan: false,
  };

  if (!supabaseAdmin) return empty;

  // Prefer spar columns when migration v14 is applied; fall back so older DBs
  // keep analysis/planner/subscription working without spar tables.
  let row: Record<string, any> | null = null;
  {
    const withSpar = await supabaseAdmin
      .from('reflex_profiles')
      .select(
        'plan, plan_expires_at, current_period_end, subscription_status, is_elite, daily_analysis_count, daily_analysis_date, weekly_planner_count, weekly_planner_week, daily_spar_count, daily_spar_date, free_spar_ad_date, free_spar_unlocked_date',
      )
      .eq('uid', uid)
      .maybeSingle();
    if (withSpar.error) {
      const legacy = await supabaseAdmin
        .from('reflex_profiles')
        .select(
          'plan, plan_expires_at, current_period_end, subscription_status, is_elite, daily_analysis_count, daily_analysis_date, weekly_planner_count, weekly_planner_week',
        )
        .eq('uid', uid)
        .maybeSingle();
      if (legacy.error || !legacy.data) return empty;
      row = legacy.data;
    } else if (!withSpar.data) {
      return empty;
    } else {
      row = withSpar.data;
    }
  }

  if (!row) return empty;

  const now = Date.now();
  const today = todayDateStr();
  const week = currentIsoWeek();
  const dailyUsed = row.daily_analysis_date === today ? row.daily_analysis_count : 0;
  const weeklyUsed = row.weekly_planner_week === week ? row.weekly_planner_count : 0;
  const sparUsed = row.daily_spar_date === today ? (row.daily_spar_count || 0) : 0;
  const freeSparUsedToday = row.free_spar_ad_date === today;
  const freeSparUnlocked = row.free_spar_unlocked_date === today && !freeSparUsedToday;
  const freeSparAvailable = !freeSparUsedToday && (!row.daily_spar_date || row.daily_spar_date !== today || (row.daily_spar_count || 0) < 1);

  const referralExpiry = row.plan_expires_at ? new Date(row.plan_expires_at).getTime() : 0;
  if (row.plan === 'referral_reward' && referralExpiry > now) {
    return {
      active: true,
      plan: 'referral_reward',
      planName: '14-Day Referral Reward',
      expiresAt: row.plan_expires_at,
      isElite: false,
      premiumGuru: false,
      dailyAnalysisLimit: REFERRAL_REWARD_LIMITS.dailyAnalysisLimit,
      weeklyPlannerLimit: REFERRAL_REWARD_LIMITS.weeklyPlannerLimit,
      sparDailyLimit: REFERRAL_REWARD_LIMITS.sparDailyLimit,
      dailyAnalysisUsed: dailyUsed,
      weeklyPlannerUsed: weeklyUsed,
      sparDailyUsed: sparUsed,
      freeSparAvailable: false,
      freeSparUnlocked: false,
      wasSubscribed: false,
      hasPurchasedPlan: false,
    };
  }

  const effectiveExpiryStr = row.current_period_end || row.plan_expires_at;
  const expiresAt = effectiveExpiryStr ? new Date(effectiveExpiryStr).getTime() : 0;
  // Cancelled / halted keep access until Razorpay's paid period ends. Failed renewals
  // never extend current_period_end, so access drops naturally when that timestamp passes.
  const blockingStatus = new Set(['expired', 'completed', 'created', 'inactive']);
  const isActiveStatus = !row.subscription_status || !blockingStatus.has(row.subscription_status);
  const isActive = !!row.plan && expiresAt > now && isActiveStatus;

  const hadPlan = !!(row.plan || row.razorpay_subscription_id);
  const hadExpiredPlan = hadPlan && (expiresAt > 0 && expiresAt <= now);

  if (!isActive) {
    return {
      ...empty,
      plan: null,
      planName: 'No subscription',
      expiresAt: hadExpiredPlan ? (effectiveExpiryStr || null) : null,
      freeSparAvailable,
      freeSparUnlocked,
      wasSubscribed: hadPlan,
      hasPurchasedPlan: hadPlan,
    };
  }

  const cfg = PLANS[row.plan as PlanId];
  if (!cfg) return { ...empty, expiresAt: effectiveExpiryStr, wasSubscribed: hadPlan, hasPurchasedPlan: hadPlan };

  return {
    active: true,
    plan: cfg.id,
    planName: cfg.name,
    expiresAt: effectiveExpiryStr,
    isElite: cfg.isElite && !!row.is_elite,
    premiumGuru: cfg.premiumGuru,
    dailyAnalysisLimit: cfg.dailyAnalysisLimit,
    weeklyPlannerLimit: cfg.weeklyPlannerLimit,
    sparDailyLimit: cfg.sparDailyLimit,
    dailyAnalysisUsed: dailyUsed,
    weeklyPlannerUsed: weeklyUsed,
    sparDailyUsed: sparUsed,
    freeSparAvailable: false,
    freeSparUnlocked: false,
    wasSubscribed: true,
    hasPurchasedPlan: true,
  };
}
