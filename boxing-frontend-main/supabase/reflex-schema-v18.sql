-- reflex-schema-v18.sql - Free spar is available without ads for now
-- Run after reflex-schema-v17.sql. This keeps the daily free limit and removes
-- the temporary ad-unlock requirement until the ad system is launched.

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
  end if;

  if v_row.free_spar_ad_date is not distinct from v_today then
    return false;
  end if;

  update reflex_profiles
    set free_spar_ad_date = v_today
    where uid = p_uid;
  return true;
end;
$$;