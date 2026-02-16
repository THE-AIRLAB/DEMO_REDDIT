import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

/**
 * Returns a Supabase client for server-side use.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in environment
 * (or SUPABASE_SERVICE_ROLE_KEY for admin access).
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error(
        'Missing Supabase config: set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in environment'
      );
    }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;
    client = createClient(SUPABASE_URL, key);
  }
  return client;
}
