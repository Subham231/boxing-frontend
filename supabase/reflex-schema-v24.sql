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
