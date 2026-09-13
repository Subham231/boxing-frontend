-- reflex-schema-v21.sql - Email/Password auth support (additive).
-- Run after reflex-schema-v20.sql in the Supabase SQL Editor.
--
-- This does NOT touch any existing row, does NOT drop/rename any column,
-- and does NOT remove the `phone` column or any phone-auth data. Existing
-- Firebase UIDs, subscriptions, streaks, scores, referrals and profiles
-- are completely untouched. It only adds two new, nullable columns so a
-- profile can optionally carry an email identity alongside (or instead
-- of) its phone identity.

alter table reflex_profiles
  add column if not exists email text;

alter table reflex_profiles
  add column if not exists email_verified boolean not null default false;

-- Tracks how this profile authenticates today, purely informational
-- (analytics / support tooling). Existing rows default to 'phone' since
-- that's how every current account was created; new email signups set
-- this to 'email' and a phone user who links an email becomes 'both'.
alter table reflex_profiles
  add column if not exists auth_method text not null default 'phone';

-- Case-insensitive uniqueness, but only once an email is actually present.
-- Partial + expression index so this never conflicts with existing rows
-- that have email = null.
create unique index if not exists reflex_profiles_email_unique_idx
  on reflex_profiles (lower(email))
  where email is not null;

-- Nothing else changes: RLS policies, reflex_scores, subscriptions,
-- referrals, and every other table from prior migrations are unaffected.
