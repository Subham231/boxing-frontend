-- Run this in the Supabase SQL Editor (Database → SQL Editor → New query).
-- Firebase phone-auth is the identity system for this feature; `uid` below
-- is the Firebase UID, not a Supabase auth.users id.

create table if not exists reflex_profiles (
  uid text primary key,
  phone text not null default '',
  referral_code text unique not null,
  referred_by text,
  referral_count int not null default 0,
  has_claimed_referral_bonus boolean not null default false,
  subscription_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reflex_scores (
  uid text not null references reflex_profiles(uid) on delete cascade,
  game_id text not null check (game_id in ('reaction_tap', 'combo_flash')),
  best_score numeric,       -- lifetime best avg reaction time (seconds), lower = better
  weekly_score numeric,     -- this week's best avg reaction time (seconds)
  week_id text not null,    -- e.g. '2026-W29'
  games_played int not null default 0,
  avg_reaction_time numeric,
  last_played timestamptz not null default now(),
  primary key (uid, game_id)
);

create index if not exists reflex_scores_weekly_idx
  on reflex_scores (game_id, week_id, weekly_score asc);

alter table reflex_profiles enable row level security;
alter table reflex_scores enable row level security;

-- Public read access (needed for the leaderboard widget + rank lookups).
-- All WRITES happen exclusively through the /api/reflex/* server routes
-- using the Supabase service_role key, which bypasses RLS entirely — so
-- there are deliberately no insert/update/delete policies here at all.
create policy "Public read profiles" on reflex_profiles
  for select using (true);

create policy "Public read scores" on reflex_scores
  for select using (true);

-- Atomic referral claim: runs entirely inside one Postgres transaction, so
-- two near-simultaneous claims (or a claim + a concurrent read) can't race
-- each other into double-counting a referral. Called only from the
-- service-role server route, never directly from the client.
create or replace function claim_referral(p_uid text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_me reflex_profiles%rowtype;
  v_referrer reflex_profiles%rowtype;
  v_new_count int;
  v_new_expiry timestamptz;
begin
  select * into v_me from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'profile not found');
  end if;
  if v_me.referred_by is null or v_me.has_claimed_referral_bonus then
    return jsonb_build_object('claimed', false, 'reason', 'nothing to claim');
  end if;

  select * into v_referrer from reflex_profiles where referral_code = v_me.referred_by for update;
  if not found or v_referrer.uid = p_uid then
    return jsonb_build_object('claimed', false, 'reason', 'invalid referrer');
  end if;

  v_new_count := v_referrer.referral_count + 1;
  v_new_expiry := v_referrer.subscription_until;

  if v_new_count % 5 = 0 then
    v_new_expiry := greatest(coalesce(v_referrer.subscription_until, now()), now()) + interval '30 days';
  end if;

  update reflex_profiles
    set referral_count = v_new_count, subscription_until = v_new_expiry
    where uid = v_referrer.uid;

  update reflex_profiles
    set has_claimed_referral_bonus = true
    where uid = p_uid;

  return jsonb_build_object('claimed', true, 'referrer_new_count', v_new_count);
end;
$$;
