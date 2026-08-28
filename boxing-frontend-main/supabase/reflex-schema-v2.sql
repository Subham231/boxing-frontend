-- Run this in the Supabase SQL Editor after the original reflex-schema.sql.

-- -----------------------------------------------------------------------
-- OTP rate limiting: max 3 send attempts per phone number per calendar day
-- (UTC). Tracked by phone number, not uid, since a number isn't associated
-- with a real account until AFTER it successfully verifies — this has to
-- stop abuse before an account even exists.
-- -----------------------------------------------------------------------
create table if not exists otp_attempt_log (
  phone text not null,
  attempt_date date not null,
  attempt_count int not null default 0,
  primary key (phone, attempt_date)
);

alter table otp_attempt_log enable row level security;
-- No client policies at all — this table is only ever touched by the
-- service-role server route.

-- Atomic check-and-increment: returns true if this attempt is allowed
-- (and records it), false if the daily cap of 3 has already been hit.
-- Doing the check + increment in one SQL function avoids a race where two
-- near-simultaneous requests both read "2 attempts so far" and both
-- proceed, blowing past the cap.
create or replace function check_and_increment_otp_attempt(p_phone text, p_max_per_day int default 3)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_count int;
begin
  insert into otp_attempt_log (phone, attempt_date, attempt_count)
  values (p_phone, v_today, 0)
  on conflict (phone, attempt_date) do nothing;

  select attempt_count into v_count
  from otp_attempt_log
  where phone = p_phone and attempt_date = v_today
  for update;

  if v_count >= p_max_per_day then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  update otp_attempt_log
    set attempt_count = attempt_count + 1
    where phone = p_phone and attempt_date = v_today;

  return jsonb_build_object('allowed', true, 'remaining', p_max_per_day - (v_count + 1));
end;
$$;

-- -----------------------------------------------------------------------
-- Expanded profile fields on the shared user row (reflex_profiles is
-- already the canonical "users" table — its `uid` is what reflex_scores
-- and subscription_until both key off of).
-- -----------------------------------------------------------------------
alter table reflex_profiles add column if not exists display_name text;
alter table reflex_profiles add column if not exists age int;
alter table reflex_profiles add column if not exists profession text;
alter table reflex_profiles add column if not exists avatar_url text;
