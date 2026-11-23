import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Browser Supabase client. Uses the anon key only: every protected read is
 * expected to pass PostgreSQL RLS, never the service-role key.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
