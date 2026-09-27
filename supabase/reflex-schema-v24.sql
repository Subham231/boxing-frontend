-- reflex-schema-v24.sql - Safe Email/Phone identity coexistence (idempotent & additive).
-- Run this in the Supabase SQL Editor if reflex-schema-v21.sql was not yet executed
-- or needs to be verified.
--
-- SAFETY GUARANTEES:
-- 1. Does NOT drop, rename, or alter any existing column or table.
-- 2. Does NOT delete or overwrite any existing phone numbers, UIDs, streak data,
--    subscriptions, scores, referrals, or user profiles.
-- 3. All new columns are nullable or have safe defaults ('phone').
-- 4. The unique index on lower(email) is partial (`where email is not null`),
--    ensuring it NEVER collides with existing phone-only rows where email is null.

-- 1. Add optional email column
alter table reflex_profiles
  add column if not exists email text;

-- 2. Add email_verified boolean flag
alter table reflex_profiles
  add column if not exists email_verified boolean not null default false;

-- 3. Add auth_method tracking column ('phone' | 'email' | 'both')
-- Defaults to 'phone' so existing phone accounts remain categorized as phone users.
alter table reflex_profiles
  add column if not exists auth_method text not null default 'phone';

-- 4. Enforce case-insensitive uniqueness only when an email is present.
create unique index if not exists reflex_profiles_email_unique_idx
  on reflex_profiles (lower(email))
  where email is not null;

-- 5. Index phone column for fast lookup in check-phone API if not already present
create index if not exists reflex_profiles_phone_idx
  on reflex_profiles (phone)
  where phone is not null and phone <> '';

-- Email OTP verification/reset support. Kept in this migration alongside
-- the existing email/phone identity additions so applying v24 preserves
-- both features. All objects below are additive and idempotent.

create table if not exists email_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  otp_hash text not null,
  purpose text not null default 'verify',
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists email_otp_verifications_email_idx
  on email_otp_verifications (email_hash, created_at desc);

create table if not exists email_otp_daily_limits (
  email_hash text not null,
  attempt_date date not null,
  send_count int not null default 0,
  last_sent_at timestamptz,
  primary key (email_hash, attempt_date)
);

alter table email_otp_verifications enable row level security;
alter table email_otp_daily_limits enable row level security;

create or replace function email_check_and_send_otp(
  p_email_hash text,
  p_max_per_day int default 5,
  p_cooldown_seconds int default 45
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row email_otp_daily_limits;
begin
  insert into email_otp_daily_limits (email_hash, attempt_date, send_count)
  values (p_email_hash, v_today, 0)
  on conflict (email_hash, attempt_date) do nothing;

  select * into v_row
    from email_otp_daily_limits
   where email_hash = p_email_hash and attempt_date = v_today
   for update;

  if v_row.last_sent_at is not null
     and v_row.last_sent_at > now() - make_interval(secs => p_cooldown_seconds) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after_seconds', p_cooldown_seconds - extract(epoch from (now() - v_row.last_sent_at))::int
    );
  end if;

  if v_row.send_count >= p_max_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'remaining', 0);
  end if;

  update email_otp_daily_limits
     set send_count = send_count + 1,
         last_sent_at = now()
   where email_hash = p_email_hash and attempt_date = v_today;

  return jsonb_build_object('allowed', true, 'remaining', p_max_per_day - (v_row.send_count + 1));
end;
$$;

create or replace function email_verify_otp(
  p_email_hash text,
  p_otp_hash text,
  p_purpose text default 'verify',
  p_max_attempts int default 5
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row email_otp_verifications;
begin
  select * into v_row
    from email_otp_verifications
   where email_hash = p_email_hash
     and purpose = p_purpose
     and used_at is null
     and expires_at > now()
   order by created_at desc
   limit 1
   for update;

  if v_row.id is null then
    return jsonb_build_object('verified', false, 'reason', 'no_active_otp');
  end if;

  if v_row.attempts >= p_max_attempts then
    return jsonb_build_object('verified', false, 'reason', 'too_many_attempts');
  end if;

  if v_row.otp_hash <> p_otp_hash then
    update email_otp_verifications set attempts = attempts + 1 where id = v_row.id;
    return jsonb_build_object('verified', false, 'reason', 'incorrect_code');
  end if;

  update email_otp_verifications set used_at = now() where id = v_row.id;
  return jsonb_build_object('verified', true);
end;
$$;
