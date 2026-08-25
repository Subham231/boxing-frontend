-- ═══════════════════════════════════════════════════════════════════════════
-- reflex-schema-v9.sql — Production Razorpay Recurring Subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add subscription metadata to reflex_profiles for tracking recurring Razorpay subscriptions
alter table reflex_profiles add column if not exists razorpay_subscription_id text;
alter table reflex_profiles add column if not exists razorpay_plan_id text;
alter table reflex_profiles add column if not exists subscription_status text default 'inactive';
alter table reflex_profiles add column if not exists current_period_start timestamptz;
alter table reflex_profiles add column if not exists current_period_end timestamptz;

-- Create index on razorpay_subscription_id for fast webhook lookups
create index if not exists reflex_profiles_razorpay_sub_id_idx on reflex_profiles (razorpay_subscription_id);

-- 2. Enhance subscription_payments table to record Razorpay subscription IDs & events
alter table subscription_payments add column if not exists razorpay_subscription_id text;
alter table subscription_payments add column if not exists event_type text;

create index if not exists subscription_payments_sub_id_idx on subscription_payments (razorpay_subscription_id);
