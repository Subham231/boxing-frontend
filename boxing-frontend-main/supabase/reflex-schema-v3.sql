-- Run in Supabase SQL Editor after reflex-schema.sql and reflex-schema-v2.sql.

create table if not exists user_streaks (
  uid text primary key references reflex_profiles(uid) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  rank_level int not null default 0,           -- 0=ROOKIE ... 6=MASTER
  streak_progress_days int not null default 0, -- consecutive active days counted toward the NEXT rank
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table user_streaks enable row level security;

-- Public read (needed to show rank badges elsewhere, e.g. leaderboards).
-- No client write policies — this table is only ever written by the
-- /api/reflex/complete-session route (service_role), which recomputes
-- everything server-side so a client can't just POST "rank_level: 6".
create policy "Public read streaks" on user_streaks
  for select using (true);
