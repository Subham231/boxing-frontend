import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// This client uses the SERVICE ROLE key, which bypasses Row Level Security.
// It must NEVER be imported into any frontend code or exposed to a browser.
// It exists only so the backend can:
//   1. Verify a user's Supabase JWT (auth.getUser)
//   2. Write subscription rows after a payment/webhook is verified
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
        '[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — ' +
        'payment routes that touch the database will fail until these are set.'
    );
}

export const supabaseAdmin: SupabaseClient | null =
    supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false },
          })
        : null;
