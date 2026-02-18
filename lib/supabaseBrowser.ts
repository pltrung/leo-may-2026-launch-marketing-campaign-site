"use client";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

/**
 * Single Supabase client instance for the browser. Ensures one client across the app
 * so session persistence and onAuthStateChange work correctly.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    if (!url || !anonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
          "Set URL to https://YOUR_PROJECT_REF.supabase.co and use the anon (public) key from Project Settings → API, not the service_role key."
      );
    }
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

/**
 * Browser Supabase client for Auth (OTP sign-in/verify).
 * Returns the same singleton instance so session state is shared.
 */
export function createBrowserClient() {
  return getSupabaseBrowserClient();
}
