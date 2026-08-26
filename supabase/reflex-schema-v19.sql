-- reflex-schema-v19.sql - serialize spar matchmaking and prevent duplicate matches
-- Run after reflex-schema-v18.sql in Supabase SQL Editor.
-- The API passes a lock key, but matchmaking must use one shared lock: locking
-- by the individual caller allows two simultaneous join requests to pair twice.

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
  v_existing record;
begin
  -- One global transaction lock makes queue selection and match creation atomic.
  perform pg_advisory_xact_lock(2147483647);

  -- Repeated polling/join requests must return the user's existing match.
  select m.id, m.player_a_uid, m.player_b_uid, m.command_sequence,
         m.is_paid_match, m.status
    into v_existing
    from public.spar_matches m
   where (m.player_a_uid = p_uid or m.player_b_uid = p_uid)
     and m.status in ('pending', 'active', 'awaiting_results')
   order by m.created_at desc
   limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'status', 'matched',
      'match_id', v_existing.id,
      'opponent_uid', case when v_existing.player_a_uid = p_uid then v_existing.player_b_uid else v_existing.player_a_uid end,
      'command_sequence', v_existing.command_sequence,
      'is_paid_match', v_existing.is_paid_match,
      'role', case when v_existing.player_a_uid = p_uid then 'offer' else 'answer' end
    );
  end if;

  select uid, is_paid
    into v_waiting_uid, v_waiting_is_paid
    from public.spar_queue
   where status = 'searching'
     and uid <> p_uid
   order by joined_at asc
   limit 1
   for update skip locked;

  if v_waiting_uid is null then
    return jsonb_build_object('status', 'searching');
  end if;

  if p_uid < v_waiting_uid then
    v_player_a_uid := p_uid;
    v_player_b_uid := v_waiting_uid;
  else
    v_player_a_uid := v_waiting_uid;
    v_player_b_uid := p_uid;
  end if;

  v_is_paid_match := p_is_paid and v_waiting_is_paid;
  v_command_sequence := public.generate_spar_command_sequence();

  insert into public.spar_matches (
    player_a_uid, player_b_uid, is_paid_match, command_sequence, status
  ) values (
    v_player_a_uid, v_player_b_uid, v_is_paid_match, v_command_sequence, 'pending'
  ) returning id into v_match_id;

  update public.spar_queue
     set status = 'matched'
   where uid in (p_uid, v_waiting_uid);

  v_role := case when p_uid = v_player_a_uid then 'offer' else 'answer' end;
  return jsonb_build_object(
    'status', 'matched',
    'match_id', v_match_id,
    'opponent_uid', v_waiting_uid,
    'command_sequence', v_command_sequence,
    'is_paid_match', v_is_paid_match,
    'role', v_role
  );
end;
$$;
