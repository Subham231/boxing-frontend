-- reflex-schema-v13.sql
-- Lock sensitive reflex_profiles columns from the anon/browser client.
-- This app uses Firebase Auth, NOT Supabase Auth, so auth.uid() RLS cannot
-- identify the current user. All private reads/writes go through service-role
-- API routes. The browser may only read public display fields via a view.
--
-- Run once in Supabase → SQL Editor.

drop policy if exists "Public read profiles" on public.reflex_profiles;

revoke all on public.reflex_profiles from anon, authenticated;
revoke all on public.subscription_payments from anon, authenticated;

-- Leaderboard / avatars only — no phone, plan, payment, or session fields.
create or replace view public.reflex_public_profiles as
  select uid, display_name, avatar_url
  from public.reflex_profiles;

grant select on public.reflex_public_profiles to anon, authenticated;

-- Scores and streaks remain publicly readable for leaderboards.
-- Writes still go through service-role API routes (no insert/update policies).
