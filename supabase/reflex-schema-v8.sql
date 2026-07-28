-- ═══════════════════════════════════════════════════════════════════════════
-- reflex-schema-v8.sql — Enforce one row per phone number
--
-- Root cause of "same number registered twice": reflex_profiles had no
-- unique constraint on `phone`, only on `uid`. Run the SELECT below FIRST
-- to see existing duplicates before adding the constraint, since the
-- constraint will fail to apply if duplicates still exist.
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1 — Inspect duplicates first (run this alone, review the output).
-- select phone, array_agg(uid) as uids, count(*)
-- from reflex_profiles
-- where phone is not null and phone <> ''
-- group by phone
-- having count(*) > 1;

-- STEP 2 — Once you've decided which row to keep for any duplicate phone
-- (usually the one with real activity/subscription/referrals — NOT the
-- admin_/blank one), delete the others, e.g.:
-- delete from reflex_profiles where uid = '<the uid to remove>';

-- STEP 3 — Enforce it going forward. Blank phone ('') is excluded from the
-- uniqueness check since older rows may have an empty placeholder value.
create unique index if not exists reflex_profiles_phone_unique_idx
  on reflex_profiles (phone)
  where phone is not null and phone <> '';
