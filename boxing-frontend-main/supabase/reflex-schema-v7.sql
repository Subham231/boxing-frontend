-- ═══════════════════════════════════════════════════════════════════════════
-- reflex-schema-v7.sql — Onboarding data persistence
--
-- Adds a JSONB column to reflex_profiles so ALL onboarding fields (goals,
-- experience_level, persona, lifestyle, height, weight, primary_goal, etc.)
-- are stored server-side and survive a phone-wide reset / browser change.
-- ═══════════════════════════════════════════════════════════════════════════

alter table reflex_profiles
  add column if not exists onboarding_data jsonb default '{}'::jsonb;
