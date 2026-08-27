-- Run after the existing profile migrations.
-- Stores one browser push subscription per authenticated Firebase user.
create table if not exists public.notification_subscriptions (
  uid text primary key references public.reflex_profiles(uid) on delete cascade,
  push_subscription jsonb not null,
  fcm_token text,
  updated_at timestamptz not null default now(),
  launch_notified_at timestamptz
);

alter table public.notification_subscriptions enable row level security;
-- Service-role API routes are the only writer/reader.
