/**
 * core/supabase.ts
 * Shared Supabase client singleton for server-side use.
 * Migrated from Python: src/core/supabase_client.py
 *
 * Uses the SERVICE ROLE KEY (full DB access, never expose to client).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';

let _supabase: SupabaseClient | null = null;

/**
 * Returns the shared Supabase admin client (singleton).
 * Will throw if environment variables are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabase) return _supabase;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Please set these in your .env file.'
    );
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('[Supabase] Admin client initialized.');
  return _supabase;
}

/**
 * Safe getter — returns null instead of throwing.
 * Use in contexts where DB access is optional (e.g., health checks).
 */
export function getSupabaseAdminSafe(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch (err) {
    console.warn('[Supabase] Client unavailable:', (err as Error).message);
    return null;
  }
}
