import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// We always export a real client instance to satisfy TypeScript and maintain 
// object structures like .channel().on().subscribe() during build-time.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined') {
    console.warn('[Supabase] Credentials missing. Real-time and database features are limited.');
  }
}

