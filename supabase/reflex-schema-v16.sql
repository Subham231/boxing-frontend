-- reflex-schema-v16.sql — Abandoned match cleanup
-- Run in Supabase SQL Editor after reflex-schema-v15.sql

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Add abandoned match cleanup function
-- ═══════════════════════════════════════════════════════════════════════════

-- Cleanup function to be called periodically (via cron job or API endpoint)
-- Marks matches stuck in 'pending' or 'active' for > 5 minutes as 'abandoned'
-- Also cleans up queue entries for users who left without matching

create or replace function public.cleanup_abandoned_spar_matches()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_abandoned_count int;
  v_queue_cleaned int;
  v_free_rows_deleted int;
  v_cutoff timestamptz := now() - interval '5 minutes';
  v_queue_cutoff timestamptz := now() - interval '3 minutes';
  v_free_delete_cutoff timestamptz := now() - interval '1 hour';
begin
  -- 1. Mark stuck matches as abandoned (pending/active > 5 min with no completion)
  update public.spar_matches
  set status = 'abandoned', completed_at = now()
  where status in ('pending', 'active')
    and created_at < v_cutoff
    and (player_a_result is null or player_b_result is null);
  get diagnostics v_abandoned_count = row_count;

  -- 2. Clean up stale queue entries (searching > 3 min)
  delete from public.spar_queue
  where status = 'searching'
    and joined_at < v_queue_cutoff;
  get diagnostics v_queue_cleaned = row_count;

  -- 3. Delete old free-tier match rows (> 1 hour, completed or abandoned)
  -- Paid matches are kept for leaderboard
  delete from public.spar_matches
  where is_paid_match = false
    and status in ('completed', 'abandoned')
    and created_at < v_free_delete_cutoff;
  get diagnostics v_free_rows_deleted = row_count;

  return jsonb_build_object(
    'abandoned_matches', v_abandoned_count,
    'queue_cleaned', v_queue_cleaned,
    'free_rows_deleted', v_free_rows_deleted
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Add cron job for automatic cleanup (requires pg_cron extension)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- If pg_cron is enabled in Supabase, uncomment the following:
--
-- select cron.schedule(
--   'cleanup-spar-matches-every-5min',
--   '*/5 * * * *',  -- every 5 minutes
--   'select public.cleanup_abandoned_spar_matches();'
-- );
--
-- To unschedule: select cron.unschedule('cleanup-spar-matches-every-5min');

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: API endpoint helper (for manual trigger or serverless cron)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Can be called from a Next.js API route or scheduled job:
-- POST /api/spar/cleanup (requires service role key)