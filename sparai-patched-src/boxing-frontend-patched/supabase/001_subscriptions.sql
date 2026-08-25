-- =============================================================================
-- Razorpay payments schema
-- Run this in Supabase → SQL Editor (or via the Supabase CLI migrations folder)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. subscriptions — the source of truth for "which person bought which plan"
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    plan_id                     text not null,                    -- your internal plan key, e.g. 'pro_monthly'
    razorpay_customer_id        text,
    razorpay_subscription_id    text unique,                       -- null for one-time purchases
    razorpay_order_id           text,                              -- used for one-time purchases
    razorpay_payment_id         text,
    status                      text not null default 'created',  -- created | active | past_due | cancelled | expired
    current_period_end          timestamptz,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- Only one row should really matter per user for "current plan" lookups —
-- but we keep history (old rows) rather than overwrite, so query by
-- `order by created_at desc limit 1` when reading "the" active plan.

-- ---------------------------------------------------------------------------
-- 2. processed_webhook_events — idempotency guard
-- ---------------------------------------------------------------------------
-- Razorpay can and will retry webhook delivery (e.g. if your server is slow
-- to respond). Without this table, a retried "payment.captured" event could
-- get processed twice. We record every event id we've already handled and
-- skip duplicates.
create table if not exists public.processed_webhook_events (
    event_id     text primary key,
    event_type   text not null,
    received_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
-- Users may READ only their own subscription rows. They may never write —
-- all writes happen from the backend using the service_role key, which
-- bypasses RLS entirely. This means a compromised or malicious client can
-- never grant themselves a subscription by calling the DB directly.
alter table public.subscriptions enable row level security;

create policy "Users can view their own subscriptions"
    on public.subscriptions
    for select
    using (auth.uid() = user_id);

-- No insert/update/delete policies are defined for the anon/authenticated
-- roles on purpose — only the service_role key (backend only) can write.

alter table public.processed_webhook_events enable row level security;
-- No policies at all here: this table is backend-only and should never be
-- readable or writable from the client, including via the anon key.

-- ---------------------------------------------------------------------------
-- 4. updated_at auto-touch trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
    before update on public.subscriptions
    for each row
    execute function public.touch_updated_at();
