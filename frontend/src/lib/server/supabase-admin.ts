// SERVER-ONLY. Never import this from a 'use client' component — the
// service_role key must never reach the browser bundle. It bypasses Row
// Level Security entirely, which is exactly why all Reflex score/referral
// writes go through this client instead of the public anon client.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Supabase service role credentials missing — /api/reflex/* routes will fail.');
}

export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;
