/**
 * Admin auth utilities. Admin accounts: admin001@gym.local, admin002@gym.local, admin003@gym.local
 * Password: leomay2026 (set via seed script)
 */

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const ADMIN_EMAILS = [
  "admin001@gym.local",
  "admin002@gym.local",
  "admin003@gym.local",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim() as (typeof ADMIN_EMAILS)[number]);
}

/**
 * Verifies the request has a valid admin session.
 * Expects Authorization: Bearer <access_token> header.
 * Returns the admin user or null.
 */
export async function getAdminFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}
