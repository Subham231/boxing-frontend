-- reflex-schema-v14.sql — Live 1v1 Sparring
-- Run once in Supabase → SQL Editor.
-- RLS enabled, NO client policies (service-role API routes only).

-- Matchmaking queue
create table if not exists public.spar_queue (
  uid          text primary key references public.reflex_profiles(uid) on delete cascade,
  joined_at    timestamptz not null default now(),
  is_paid      boolean not null,
  status       text not null default 'searching'
);

-- Matches (free rows deleted after ~1h; paid rows kept for leaderboard)
create table if not exists public.spar_matches (
  id                  uuid primary key default gen_random_uuid(),
  player_a_uid        text not null references public.reflex_profiles(uid),
  player_b_uid        text not null references public.reflex_profiles(uid),
  is_paid_match       boolean not null,
  command_sequence    jsonb not null,
  status              text not null default 'pending',
  player_a_result     jsonb,
  player_b_result     jsonb,
  winner_uid          text references public.reflex_profiles(uid),
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists spar_matches_status_idx on public.spar_matches (status);
create index if not exists spar_matches_created_idx on public.spar_matches (created_at);

create table if not exists public.spar_result_submissions (
  match_id     uuid not null references public.spar_matches(id) on delete cascade,
  uid          text not null references public.reflex_profiles(uid),
  submitted_at timestamptz not null default now(),
  primary key (match_id, uid)
);

create table if not exists public.spar_leaderboard (
  uid          text primary key references public.reflex_profiles(uid) on delete cascade,
  display_name text not null,
  wins         integer not null default 0,
  losses       integer not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.spar_queue enable row level security;
alter table public.spar_matches enable row level security;
alter table public.spar_result_submissions enable row level security;
alter table public.spar_leaderboard enable row level security;
-- No policies: service-role only.

-- Daily spar counters on profiles
alter table public.reflex_profiles add column if not exists daily_spar_count integer not null default 0;
alter table public.reflex_profiles add column if not exists daily_spar_date date;
alter table public.reflex_profiles add column if not exists free_spar_ad_date date;
-- Staged unlock from ad SSV (or gated dev unlock) before queue/join consumes credit
alter table public.reflex_profiles add column if not exists free_spar_unlocked_date date;

-- Atomic consume (caller checks paid plan limit first)
create or replace function public.try_consume_spar_credit(p_uid text, p_is_paid boolean)
returns boolean
language plpgsql
security definer
as $$
declare
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_row reflex_profiles%rowtype;
begin
  select * into v_row from reflex_profiles where uid = p_uid for update;
  if not found then return false; end if;

  if p_is_paid then
    if v_row.daily_spar_date is distinct from v_today then
      update reflex_profiles
        set daily_spar_count = 0, daily_spar_date = v_today
        where uid = p_uid;
      v_row.daily_spar_count := 0;
    end if;
    update reflex_profiles
      set daily_spar_count = daily_spar_count + 1, daily_spar_date = v_today
      where uid = p_uid;
    return true;
  else
    -- Must have unlocked via ad SSV today, and not already consumed today's free spar
    if v_row.free_spar_unlocked_date is distinct from v_today then
      return false;
    end if;
    if v_row.free_spar_ad_date is not distinct from v_today then
      return false;
    end if;
    update reflex_profiles
      set free_spar_ad_date = v_today
      where uid = p_uid;
    return true;
  end if;
end;
$$;

-- Mark free spar unlocked after verified ad (SSV)
create or replace function public.unlock_free_spar_ad(p_uid text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_row reflex_profiles%rowtype;
begin
  select * into v_row from reflex_profiles where uid = p_uid for update;
  if not found then return false; end if;
  if v_row.free_spar_ad_date is not distinct from v_today then
    return false; -- already used today's free spar
  end if;
  update reflex_profiles set free_spar_unlocked_date = v_today where uid = p_uid;
  return true;
end;
$$;
