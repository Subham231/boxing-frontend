-- Run in Supabase SQL Editor after reflex-schema.sql, v2, and v3.
--
-- Fixes the streak-break bug: user_streaks.last_active_date was a UTC
-- *calendar date*, so whether two sessions counted as "consecutive" (or as
-- a missed day) depended on what time of day the user trained relative to
-- UTC midnight — a real problem for users in India (UTC+5:30) and anywhere
-- else off UTC. This switches the column to a timestamp so the app can
-- compare rolling 24h/48h windows instead of calendar days.

alter table user_streaks add column if not exists last_active_at timestamptz;

-- Backfill: treat the old calendar date as local midday UTC so existing
-- rows get a sane starting timestamp instead of NULL (NULL would look like
-- "never active" and wrongly zero out real streaks on first read).
update user_streaks
  set last_active_at = (last_active_date::timestamp + interval '12 hours') at time zone 'utc'
  where last_active_at is null and last_active_date is not null;

-- last_active_date is kept (not dropped) for now, in case anything else
-- still reads it — it is simply no longer written to or trusted by the
-- rank engine. Safe to drop in a future cleanup once confirmed unused.
