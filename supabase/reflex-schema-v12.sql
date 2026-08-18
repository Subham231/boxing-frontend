-- reflex-schema-v12.sql
-- Webhook idempotency + confirm usage-limit RPCs exist.
-- Run once in Supabase → SQL Editor.
-- Does NOT replace reflex_profiles. The Next.js app remains the source of truth
-- for plan / dates / usage. Do not use public.subscriptions (auth.users) for this.

-- 1. Idempotency guard for Razorpay webhook retries
create table if not exists public.processed_webhook_events (
  event_id     text primary key,
  event_type   text not null,
  received_at  timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;
-- No client policies: service-role only.

-- 2. Atomic daily analysis consume (lazy midnight reset via date compare)
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

  -- p_limit < 0 means unlimited (yearly)
  if p_limit >= 0 and v_count >= p_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily limit reached', 'used', v_count, 'limit', p_limit);
  end if;

  update reflex_profiles
    set daily_analysis_count = v_count + 1, daily_analysis_date = p_today
    where uid = p_uid;

  return jsonb_build_object('allowed', true, 'used', v_count + 1, 'limit', p_limit);
end;
$$;

-- 3. Atomic weekly planner consume (lazy ISO-week reset)
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
