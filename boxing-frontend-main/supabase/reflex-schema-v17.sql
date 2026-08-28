-- reflex-schema-v17.sql — Anonymous usage abuse protection
-- Run in Supabase SQL Editor after reflex-schema-v16.sql
--
-- Tracks onboarding analysis usage by anonymous session ID + hashed IP.
-- Raw IPs are never stored — only a SHA-256 digest is kept so we can
-- detect abuse patterns without holding PII.
--
-- Enforcement strategy:
--   1. Session ID  — generated client-side, stored in localStorage.
--                    Blocks casual repeat use in the same browser.
--   2. IP hash     — secondary signal. Allows up to 3 attempts per IP
--                    per day to tolerate shared NATs / CGNATs,
--                    while blocking coordinated abuse.
--
-- The real gate for free sparring remains the DB-level atomic
-- try_consume_spar_credit function (requires Firebase auth).

-- ─────────────────────────────────────────────────────────────────────
-- 1. Usage tracking table
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.anon_usage (
  id          uuid        primary key default gen_random_uuid(),
  session_id  text        not null,
  ip_hash     text,                         -- SHA-256 of client IP, nullable
  feature     text        not null,         -- 'boxing_analysis' | 'free_spar'
  used_at     timestamptz not null default now()
);

create index if not exists anon_usage_session_feature_idx
  on public.anon_usage (session_id, feature);

create index if not exists anon_usage_ip_feature_date_idx
  on public.anon_usage (ip_hash, feature, used_at)
  where ip_hash is not null;

alter table public.anon_usage enable row level security;
-- No client policies — service-role API routes only.

-- ─────────────────────────────────────────────────────────────────────
-- 2. Atomic check-and-record function
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.try_consume_anon_usage(
  p_session_id         text,
  p_ip_hash            text,           -- pass null if IP unavailable
  p_feature            text,
  p_limit_per_session  int default 1,
  p_limit_per_ip_day   int default 3   -- generous to handle NAT/CGNAT
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_session_count int;
  v_ip_count      int;
  v_today_start   timestamptz := date_trunc('day', now() at time zone 'UTC');
begin
  -- 1. Check per-session limit (total lifetime, not per day)
  select count(*) into v_session_count
  from public.anon_usage
  where session_id = p_session_id
    and feature    = p_feature;

  if v_session_count >= p_limit_per_session then
    return false;
  end if;

  -- 2. Check per-IP daily limit (secondary signal only)
  if p_ip_hash is not null then
    select count(*) into v_ip_count
    from public.anon_usage
    where ip_hash  = p_ip_hash
      and feature  = p_feature
      and used_at >= v_today_start;

    if v_ip_count >= p_limit_per_ip_day then
      return false;
    end if;
  end if;

  -- 3. Record usage atomically
  insert into public.anon_usage (session_id, ip_hash, feature)
  values (p_session_id, p_ip_hash, p_feature);

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Cleanup old rows (keep last 30 days; call via cron or piggyback
--    onto the existing spar/cleanup endpoint)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.cleanup_anon_usage()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.anon_usage
  where used_at < now() - interval '30 days';
end;
$$;
