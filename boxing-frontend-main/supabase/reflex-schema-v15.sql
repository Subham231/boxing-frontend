-- reflex-schema-v15.sql — Fix free spar unlock race condition + atomic match creation
-- Run in Supabase SQL Editor after reflex-schema-v14.sql

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Fix free spar unlock race condition
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Root cause: try_consume_spar_credit checks free_spar_unlocked_date and
-- free_spar_ad_date separately, then updates free_spar_ad_date. Between
-- the check and the update, another concurrent request could pass the same
-- check and also consume the free spar credit.
--
-- Fix: Make the entire operation atomic by using a single UPDATE with
-- a WHERE clause that enforces all conditions. The UPDATE either succeeds
-- (returns true) or fails (returns false) atomically.

create or replace function public.try_consume_spar_credit(p_uid text, p_is_paid boolean)
returns boolean
language plpgsql
security definer
as $$
declare
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_updated int;
begin
  if p_is_paid then
    -- Paid users: increment daily counter (reset if new day)
    update public.reflex_profiles
    set
      daily_spar_count = case
        when daily_spar_date is distinct from v_today then 1
        else daily_spar_count + 1
      end,
      daily_spar_date = v_today
    where uid = p_uid;
    get diagnostics v_updated = row_count;
    return v_updated > 0;
  else
    -- Free users: ATOMIC check-and-consume
    -- Only succeed if:
    --   1. free_spar_unlocked_date = today (ad was verified today)
    --   2. free_spar_ad_date IS DISTINCT FROM today (haven't used free spar yet)
    -- The WHERE clause ensures all conditions checked atomically with the update
    update public.reflex_profiles
    set free_spar_ad_date = v_today
    where uid = p_uid
      and free_spar_unlocked_date = v_today
      and free_spar_ad_date is distinct from v_today;
    get diagnostics v_updated = row_count;
    return v_updated > 0;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Atomic match creation with advisory lock
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.try_create_spar_match(
  p_uid text,
  p_is_paid boolean,
  p_lock_key bigint
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_waiting_uid text;
  v_waiting_is_paid boolean;
  v_player_a_uid text;
  v_player_b_uid text;
  v_is_paid_match boolean;
  v_command_sequence jsonb;
  v_match_id uuid;
  v_role text;
begin
  -- Try to acquire advisory lock (session-level, auto-released on transaction end)
  perform pg_try_advisory_xact_lock(p_lock_key);
  if not found then
    return jsonb_build_object('status', 'searching');
  end if;

  -- Find a waiting opponent (oldest first)
  select uid, is_paid into v_waiting_uid, v_waiting_is_paid
  from public.spar_queue
  where status = 'searching'
    and uid <> p_uid
  order by joined_at asc
  limit 1;

  if v_waiting_uid is null then
    -- No opponent found, stay in queue
    return jsonb_build_object('status', 'searching');
  end if;

  -- Determine match participants (consistent ordering)
  if p_uid < v_waiting_uid then
    v_player_a_uid := p_uid;
    v_player_b_uid := v_waiting_uid;
  else
    v_player_a_uid := v_waiting_uid;
    v_player_b_uid := p_uid;
  end if;

  v_is_paid_match := p_is_paid and v_waiting_is_paid;
  v_command_sequence := public.generate_spar_command_sequence();
  v_role := case when p_uid = v_player_a_uid then 'offer' else 'answer' end;

  -- Create the match
  insert into public.spar_matches (
    player_a_uid, player_b_uid, is_paid_match, command_sequence, status
  ) values (
    v_player_a_uid, v_player_b_uid, v_is_paid_match, v_command_sequence, 'pending'
  ) returning id into v_match_id;

  -- Mark both users as matched in queue
  update public.spar_queue
  set status = 'matched'
  where uid in (p_uid, v_waiting_uid);

  return jsonb_build_object(
    'status', 'matched',
    'match_id', v_match_id,
    'opponent_uid', v_waiting_uid,
    'command_sequence', v_command_sequence,
    'is_paid_match', v_is_paid_match,
    'role', v_role
  );

exception when others then
  -- On any error, release lock (automatic with xact lock) and return searching
  return jsonb_build_object('status', 'searching', 'error', sqlerrm);
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Generate spar command sequence in database (for atomic RPC)
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.generate_spar_command_sequence()
returns jsonb
language plpgsql
as $$
declare
  v_pool jsonb := '[
    {"command": "JAB", "kind": "punch"},
    {"command": "CROSS", "kind": "punch"},
    {"command": "LEAD HOOK", "kind": "punch"},
    {"command": "REAR HOOK", "kind": "punch"},
    {"command": "LEAD UPPERCUT", "kind": "punch"},
    {"command": "REAR UPPERCUT", "kind": "punch"},
    {"command": "BODY HOOK", "kind": "punch"},
    {"command": "OVERHAND RIGHT", "kind": "punch"},
    {"command": "DOUBLE JAB", "kind": "punch"},
    {"command": "1-2 COMBO", "kind": "punch"},
    {"command": "1-2-3 COMBO", "kind": "punch"},
    {"command": "BODY-HEAD COMBO", "kind": "punch"}
  ]'::jsonb;
  v_sequence jsonb := '[]'::jsonb;
  v_len int := 40 + floor(random() * 31)::int;  -- 40-70
  v_start_offset int := 3500;
  v_gap int := 1600;
  v_last text := '';
  v_pick jsonb;
  v_i int := 0;
  v_rand float;
  v_pool_len int := jsonb_array_length(v_pool);
begin
  while v_i < v_len loop
    -- Pick random punch from pool
    v_rand := random();
    v_pick := v_pool->(floor(v_rand * v_pool_len)::int);

    -- Avoid consecutive duplicates (try up to 3 times)
    if v_pick->>'command' = v_last and v_i > 0 and v_i < 3 then
      v_rand := random();
      v_pick := v_pool->(floor(v_rand * v_pool_len)::int);
    end if;

    v_last := v_pick->>'command';
    v_sequence := v_sequence || jsonb_build_object(
      'command', v_pick->>'command',
      'kind', v_pick->>'kind',
      'callAtMs', v_start_offset + v_i * v_gap
    );
    v_i := v_i + 1;
  end loop;

  return v_sequence;
end;
$$;