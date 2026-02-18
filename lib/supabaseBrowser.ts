"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client for Auth (OTP sign-in/verify).
 * Uses anon key so auth.uid() is set for RPC and RLS.
 * Do not use service role key in the browser.
 */
export function createBrowserClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set URL to https://YOUR_PROJECT_REF.supabase.co and use the anon (public) key from Project Settings → API, not the service_role key."
    );
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
