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
  isElite: boolean;
  premiumGuru: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceInPaise: 39900, // ₹399
    durationDays: 30,
    dailyAnalysisLimit: 1,
    weeklyPlannerLimit: 1,
    isElite: false,
    premiumGuru: false,
  },
  monthly_pro: {
    id: 'monthly_pro',
    name: 'Monthly Pro',
    priceInPaise: 49900, // ₹499
    durationDays: 30,
    dailyAnalysisLimit: 2,
    weeklyPlannerLimit: 2,
    isElite: false,
    premiumGuru: false,
  },
  three_month: {
    id: 'three_month',
    name: '3 Months',
    priceInPaise: 99900, // ₹999
    durationDays: 90,
    dailyAnalysisLimit: 3,
    weeklyPlannerLimit: 3,
    isElite: false,
    premiumGuru: false,
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    priceInPaise: 299900, // ₹2,999
    durationDays: 365,
    dailyAnalysisLimit: -1,
    weeklyPlannerLimit: -1,
    isElite: true,
    premiumGuru: true,
  },
};

// The referral reward isn't a purchasable plan, but it needs limits too —
// treated as equivalent to the base Monthly tier's daily/weekly allowance,
// not Elite (spec doesn't say the free reward includes Elite/Guru perks).
const REFERRAL_REWARD_LIMITS = {
  dailyAnalysisLimit: 1,
  weeklyPlannerLimit: 1,
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
  dailyAnalysisUsed: number;
  weeklyPlannerUsed: number;
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
  return new Date().toISOString().slice(0, 10);
}

export function currentIsoWeek(): string {
  return isoWeek(new Date());
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
    planName: 'Free',
    expiresAt: null,
    isElite: false,
    premiumGuru: false,
    dailyAnalysisLimit: 0,
    weeklyPlannerLimit: 0,
    dailyAnalysisUsed: 0,
    weeklyPlannerUsed: 0,
  };

  if (!supabaseAdmin) return empty;

  const { data: row, error } = await supabaseAdmin
    .from('reflex_profiles')
    .select('plan, plan_expires_at, is_elite, daily_analysis_count, daily_analysis_date, weekly_planner_count, weekly_planner_week')
    .eq('uid', uid)
    .maybeSingle();

  if (error || !row) return empty;

  const now = Date.now();
  const expiresAt = row.plan_expires_at ? new Date(row.plan_expires_at).getTime() : 0;
  const isActive = !!row.plan && expiresAt > now;

  if (!isActive) {
    return { ...empty, plan: null, planName: 'Free', expiresAt: row.plan_expires_at || null };
  }

  const today = todayDateStr();
  const week = currentIsoWeek();
  const dailyUsed = row.daily_analysis_date === today ? row.daily_analysis_count : 0;
  const weeklyUsed = row.weekly_planner_week === week ? row.weekly_planner_count : 0;

  if (row.plan === 'referral_reward') {
    return {
      active: true,
      plan: 'referral_reward',
      planName: '14-Day Referral Reward',
      expiresAt: row.plan_expires_at,
      isElite: false,
      premiumGuru: false,
      dailyAnalysisLimit: REFERRAL_REWARD_LIMITS.dailyAnalysisLimit,
      weeklyPlannerLimit: REFERRAL_REWARD_LIMITS.weeklyPlannerLimit,
      dailyAnalysisUsed: dailyUsed,
      weeklyPlannerUsed: weeklyUsed,
    };
  }

  const cfg = PLANS[row.plan as PlanId];
  if (!cfg) return { ...empty, expiresAt: row.plan_expires_at };

  return {
    active: true,
    plan: cfg.id,
    planName: cfg.name,
    expiresAt: row.plan_expires_at,
    isElite: cfg.isElite && !!row.is_elite,
    premiumGuru: cfg.premiumGuru,
    dailyAnalysisLimit: cfg.dailyAnalysisLimit,
    weeklyPlannerLimit: cfg.weeklyPlannerLimit,
    dailyAnalysisUsed: dailyUsed,
    weeklyPlannerUsed: weeklyUsed,
  };
}
