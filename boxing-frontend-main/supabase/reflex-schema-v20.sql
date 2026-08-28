-- reflex-schema-v20.sql - HanuOTP custom auth (dark-launched, not yet wired
-- into any live route or the UI). Run after reflex-schema-v19.sql in the
-- Supabase SQL Editor.
--
-- This is entirely additive: no existing table is altered. New users
-- created through this path get uid = 'ho_' || gen_random_uuid() so every
-- existing FK relationship (reflex_scores, subscriptions, referrals,
-- planner, streaks) keeps working against reflex_profiles.uid exactly as
-- it does today for Firebase uids — see /api/hanu-auth/verify-otp.

-- ---------------------------------------------------------------------------
-- OTP records. otp_hash is an HMAC, never the raw code. expires_at is
-- checked at query time inside hanu_verify_otp, so a stale row can never be
-- accepted even if the cleanup job below hasn't run yet.
-- ---------------------------------------------------------------------------
create table if not exists hanu_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  otp_hash text not null,
  purpose text not null default 'login',
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  ip_hash text
);

create index if not exists hanu_otp_verifications_phone_idx
  on hanu_otp_verifications (phone_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Daily send limit + resend cooldown. One row per phone per day, locked with
-- FOR UPDATE inside hanu_check_and_send_otp — same pattern already proven
-- by check_and_increment_otp_attempt in reflex-schema-v2.sql, so two
-- simultaneous send requests can never both slip through and exceed the cap.
-- ---------------------------------------------------------------------------
create table if not exists hanu_otp_daily_limits (
  phone_hash text not null,
  attempt_date date not null,
  send_count int not null default 0,
  last_sent_at timestamptz,
  primary key (phone_hash, attempt_date)
);

-- ---------------------------------------------------------------------------
-- Login sessions. session_hash is an HMAC of the random token that's set in
-- the HttpOnly cookie — only the hash ever touches the database.
-- ---------------------------------------------------------------------------
create table if not exists hanu_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  session_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists hanu_auth_sessions_uid_idx on hanu_auth_sessions (uid);

alter table hanu_otp_verifications enable row level security;
alter table hanu_otp_daily_limits enable row level security;
alter table hanu_auth_sessions enable row level security;

-- No public policies on any of the three tables above, deliberately — every
-- read/write happens through /api/hanu-auth/* using the service_role key
-- (supabaseAdmin), which bypasses RLS. The browser never talks to these
-- tables directly.

-- ---------------------------------------------------------------------------
-- Atomic "can this phone send another OTP right now" check + increment.
-- Locks the day's row so concurrent requests can't both observe count < max
-- and both proceed (the exact race condition called out for this feature).
-- ---------------------------------------------------------------------------
create or replace function hanu_check_and_send_otp(
  p_phone_hash text,
  p_max_per_day int default 3,
  p_cooldown_seconds int default 60
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row hanu_otp_daily_limits;
begin
  insert into hanu_otp_daily_limits (phone_hash, attempt_date, send_count)
  values (p_phone_hash, v_today, 0)
  on conflict (phone_hash, attempt_date) do nothing;

  select * into v_row
    from hanu_otp_daily_limits
   where phone_hash = p_phone_hash and attempt_date = v_today
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

  update hanu_otp_daily_limits
     set send_count = send_count + 1,
         last_sent_at = now()
   where phone_hash = p_phone_hash and attempt_date = v_today;

  return jsonb_build_object('allowed', true, 'remaining', p_max_per_day - (v_row.send_count + 1));
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic OTP verification. Locks the most recent unused row for this phone,
-- enforces the 5-attempt cap, and only marks used_at on a correct hash
-- match. Rejects anything already used or past expires_at regardless of
-- whether the cleanup job has run.
-- ---------------------------------------------------------------------------
create or replace function hanu_verify_otp(
  p_phone_hash text,
  p_otp_hash text,
  p_max_attempts int default 5
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row hanu_otp_verifications;
begin
  select * into v_row
    from hanu_otp_verifications
   where phone_hash = p_phone_hash
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
    update hanu_otp_verifications set attempts = attempts + 1 where id = v_row.id;
    return jsonb_build_object('verified', false, 'reason', 'incorrect_code');
  end if;

  update hanu_otp_verifications set used_at = now() where id = v_row.id;
  return jsonb_build_object('verified', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Housekeeping only (not a security control — expiry is enforced above
-- regardless of whether this has run). Requires pg_cron to be enabled on
-- the project; if it isn't, skip this block and clean up manually/via a
-- scheduled edge function instead.
-- ---------------------------------------------------------------------------
-- select cron.schedule(
--   'hanu-otp-cleanup',
--   '*/10 * * * *',
--   $$delete from hanu_otp_verifications where expires_at < now() - interval '1 day'$$
-- );
