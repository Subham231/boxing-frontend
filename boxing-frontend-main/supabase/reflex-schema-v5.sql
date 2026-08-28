-- Run in Supabase SQL Editor after v1-v4.
-- Adds the "Combat Promise" trigger word from onboarding so it can live in
-- Supabase (not just localStorage) and sync across devices via the Profile
-- page, same as display_name/age/profession/avatar_url already do.

alter table reflex_profiles add column if not exists promise_word text;

-- Enable realtime so the Fighter Board leaderboard updates live whenever
-- anyone's streak/rank changes, instead of requiring a manual refresh.
alter publication supabase_realtime add table user_streaks;
