-- reflex-schema-v23.sql — Polar international payment provider (additive only)
-- Run after reflex-schema-v22.sql in the Supabase SQL Editor.
--
-- Mirrors reflex-schema-v9.sql's Razorpay columns, but for Polar. Every
-- statement is `add column if not exists` — nothing here drops, renames,
-- or alters an existing column, and nothing here touches Razorpay's
-- columns or data. The two providers write into the SAME plan /
-- subscription_status / current_period_start / current_period_end columns
-- that already exist (see reflex-schema-v9.sql) — that's what keeps
-- getEntitlement() in lib/server/entitlements.ts provider-agnostic. These
-- new columns are metadata/bookkeeping only, never read by entitlement logic.

-- 1. Provider + country/currency bookkeeping on reflex_profiles.
alter table reflex_profiles add column if not exists payment_provider text;
alter table reflex_profiles add column if not exists country_code text;
alter table reflex_profiles add column if not exists currency_code text;

-- 2. Polar-specific identifiers, parallel to the existing razorpay_* columns.
alter table reflex_profiles add column if not exists polar_customer_id text;
alter table reflex_profiles add column if not exists polar_product_id text;
alter table reflex_profiles add column if not exists polar_subscription_id text;
alter table reflex_profiles add column if not exists polar_checkout_id text;

create index if not exists reflex_profiles_polar_sub_id_idx on reflex_profiles (polar_subscription_id);
create index if not exists reflex_profiles_polar_customer_id_idx on reflex_profiles (polar_customer_id);

-- 3. Mirror the same additions on subscription_payments (parallel to
--    reflex-schema-v9.sql's razorpay_subscription_id + event_type additions).
--    polar_payment_id carries the same UNIQUE-style idempotency role that
--    razorpay_payment_id already has via the unique constraint from
--    reflex-schema-v6.sql — enforced here too so a duplicate Polar webhook
--    can never insert a second payment row for the same order/payment.
alter table subscription_payments add column if not exists polar_payment_id text unique;
alter table subscription_payments add column if not exists polar_subscription_id text;
alter table subscription_payments add column if not exists polar_order_id text;
alter table subscription_payments add column if not exists provider text default 'razorpay';
alter table subscription_payments add column if not exists country text;
alter table subscription_payments add column if not exists currency text;

create index if not exists subscription_payments_polar_sub_id_idx on subscription_payments (polar_subscription_id);

-- 4. processed_webhook_events already has event_id as its primary key
--    (reflex-schema-v12.sql / 001_subscriptions.sql). Rather than altering
--    that primary key (which the "no destructive changes" rule advises
--    against on a live table), Polar webhook event ids are inserted with a
--    "polar:" prefix (see lib/server/sync-subscription.ts /
--    markWebhookEventProcessed callers in app/api/polar/webhook/route.ts).
--    This guarantees uniqueness against Razorpay's own event ids without
--    touching the existing table shape at all.

-- 5. Backfill: existing rows with a Razorpay subscription are explicitly
--    tagged so payment_provider is never null for pre-existing paid users
--    (keeps any future `where payment_provider = 'polar'` filter honest).
update reflex_profiles
  set payment_provider = 'razorpay'
  where payment_provider is null
    and razorpay_subscription_id is not null;
