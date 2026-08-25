-- ═══════════════════════════════════════════════════════════════════════════
-- reflex-schema-v10.sql — Refund usage counters on generation failures
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function refund_daily_analysis(p_uid text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select daily_analysis_count into v_count from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'profile not found');
  end if;

  if v_count > 0 then
    update reflex_profiles set daily_analysis_count = v_count - 1 where uid = p_uid;
    return jsonb_build_object('success', true, 'new_count', v_count - 1);
  end if;

  return jsonb_build_object('success', true, 'new_count', 0);
end;
$$;

create or replace function refund_weekly_planner(p_uid text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select weekly_planner_count into v_count from reflex_profiles where uid = p_uid for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'profile not found');
  end if;

  if v_count > 0 then
    update reflex_profiles set weekly_planner_count = v_count - 1 where uid = p_uid;
    return jsonb_build_object('success', true, 'new_count', v_count - 1);
  end if;

  return jsonb_build_object('success', true, 'new_count', 0);
end;
$$;
