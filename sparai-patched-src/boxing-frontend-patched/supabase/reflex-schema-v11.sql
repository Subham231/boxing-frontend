-- ═══════════════════════════════════════════════════════════════════════════
-- reflex-schema-v11.sql — Single Device Concurrent Session Management
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add current_session_token column to reflex_profiles
alter table reflex_profiles add column if not exists current_session_token text;

-- Create index for fast session validation checks
create index if not exists reflex_profiles_session_token_idx on reflex_profiles (current_session_token);
