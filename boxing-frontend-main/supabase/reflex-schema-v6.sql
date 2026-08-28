-- Run in Supabase SQL Editor after v1-v5.
-- Premium Subscription & Membership System.
--
-- SECURITY MODEL: every column here is written exclusively by
-- /api/subscription/* server routes using the supabaseAdmin (service_role)
-- client, which bypasses RLS. There are still no client-writable policies
-- on any of this — the client can only ever READ its own entitlement via
-- the server-computed /api/subscription/status response. Nothing about
-- plan/expiry/usage is ever trusted from the client.

-- ---------------------------------------------------------------------
-- 1. Plan + usage tracking columns on reflex_profiles
-- ---------------------------------------------------------------------
alter table reflex_profiles add column if not exists plan text; -- 'monthly' | 'monthly_pro' | 'three_month' | 'yearly' | 'referral_reward' | null
alter table reflex_profiles add column if not exists plan_started_at timestamptz;
alter table reflex_profiles add column if not exists plan_expires_at timestamptz;
alter table reflex_profiles add column if not exists is_elite boolean not null default false;

-- Daily AI Video Analysis usage (resets when daily_analysis_date != today)
alter table reflex_profiles add column if not exists daily_analysis_count int not null default 0;
alter table reflex_profiles add column if not exists daily_analysis_date date;

-- Weekly Planner Generation usage (resets when weekly_planner_week != this ISO week)
alter table reflex_profiles add column if not exists weekly_planner_count int not null default 0;
alter table reflex_profiles add column if not exists weekly_planner_week text;

-- One-time 5-referral -> 14-day-premium reward, tracked separately from
-- has_claimed_referral_bonus (which is about REDEEMING a code as the new
-- signup, not about EARNING this reward as the referrer). This can only
-- ever be granted once per account, ever — no modulo/repeat logic.
alter table reflex_profiles add column if not exists referral_bonus_5_claimed boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Payments ledger — the idempotency guard against duplicate activation
-- ---------------------------------------------------------------------
create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  uid text not null references reflex_profiles(uid) on delete cascade,
  razorpay_payment_id text unique, -- UNIQUE is what makes double-activation impossible
  razorpay_order_id text,
  plan text not null,
  amount_paise int not null,
  status text not null default 'verified',
  created_at timestamptz not null default now()
);

alter table subscription_payments enable row level security;
-- No policies at all: only the service-role server routes ever touch this
-- table. A user cannot read or write their own payment rows directly.

-- ---------------------------------------------------------------------
-- 3. Atomic usage-limit RPCs — the actual server-side enforcement.
--    Both run inside FOR UPDATE row locks so two concurrent requests from
--    the same account can never both "just barely" slip under the limit.
-- ---------------------------------------------------------------------

create or replace function try_consume_daily_analysis(p_uid text, p_limit int, p_today date)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row reflex_profiles%rowtype;
  v_count int;
begin
  select * into v_row from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile not found');
  end if;

  if v_row.daily_analysis_date is distinct from p_today then
    v_count := 0;
  else
    v_count := v_row.daily_analysis_count;
  end if;

  if p_limit >= 0 and v_count >= p_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily limit reached', 'used', v_count, 'limit', p_limit);
  end if;

  update reflex_profiles
    set daily_analysis_count = v_count + 1, daily_analysis_date = p_today
    where uid = p_uid;

  return jsonb_build_object('allowed', true, 'used', v_count + 1, 'limit', p_limit);
end;
$$;

create or replace function try_consume_weekly_planner(p_uid text, p_limit int, p_week text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row reflex_profiles%rowtype;
  v_count int;
begin
  select * into v_row from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile not found');
  end if;

  if v_row.weekly_planner_week is distinct from p_week then
    v_count := 0;
  else
    v_count := v_row.weekly_planner_count;
  end if;

  if p_limit >= 0 and v_count >= p_limit then
    return jsonb_build_object('allowed', false, 'reason', 'weekly limit reached', 'used', v_count, 'limit', p_limit);
  end if;

  update reflex_profiles
    set weekly_planner_count = v_count + 1, weekly_planner_week = p_week
    where uid = p_uid;

  return jsonb_build_object('allowed', true, 'used', v_count + 1, 'limit', p_limit);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. One-time 5-referral reward (replaces the old repeatable modulo-5
--    logic in claim_referral — that function still runs on every new
--    signup that redeems a code, but now only grants this specific
--    reward once, at the moment the referrer's count first reaches 5).
-- ---------------------------------------------------------------------
create or replace function claim_referral(p_uid text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_me reflex_profiles%rowtype;
  v_referrer reflex_profiles%rowtype;
  v_new_count int;
  v_bonus_granted boolean := false;
begin
  select * into v_me from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'profile not found');
  end if;
  if v_me.referred_by is null or v_me.has_claimed_referral_bonus then
    return jsonb_build_object('claimed', false, 'reason', 'nothing to claim');
  end if;

  select * into v_referrer from reflex_profiles where referral_code = v_me.referred_by for update;
  if not found or v_referrer.uid = p_uid then
    return jsonb_build_object('claimed', false, 'reason', 'invalid referrer');
  end if;

  v_new_count := v_referrer.referral_count + 1;

  update reflex_profiles set referral_count = v_new_count where uid = v_referrer.uid;

  -- Exactly once per account, exactly at 5 verified referrals.
  if v_new_count >= 5 and not v_referrer.referral_bonus_5_claimed then
    update reflex_profiles
      set referral_bonus_5_claimed = true,
          plan = 'referral_reward',
          plan_started_at = now(),
          plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '14 days'
      where uid = v_referrer.uid;
    v_bonus_granted := true;
  end if;

  update reflex_profiles set has_claimed_referral_bonus = true where uid = p_uid;

  return jsonb_build_object('claimed', true, 'referrer_new_count', v_new_count, 'referrer_bonus_granted', v_bonus_granted);
end;
$$;
