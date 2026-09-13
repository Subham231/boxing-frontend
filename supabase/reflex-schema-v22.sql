-- reflex-schema-v22.sql - synced spar match clock
-- Run after reflex-schema-v21.sql in the Supabase SQL Editor.
--
-- Both fighters derive their command timeline from this single persisted
-- timestamp instead of starting a local clock after their own setup finishes.

alter table public.spar_matches
  add column if not exists match_started_at timestamptz;