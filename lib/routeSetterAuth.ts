/**
 * Route setter / staff auth. Staff accounts: routesetter1@gym.local ... routesetter4@gym.local
 * Role: route_setter. Only these accounts can access /route-setter.
 */

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const ROUTE_SETTER_EMAILS = [
  "routesetter1@gym.local",
  "routesetter2@gym.local",
  "routesetter3@gym.local",
  "routesetter4@gym.local",
] as const;

export type StaffRole = "route_setter" | "coach";

export interface StaffProfile {
  id: string;
  auth_id: string;
  email: string;
  role: StaffRole;
  display_name: string | null;
}

export function isRouteSetterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ROUTE_SETTER_EMAILS.includes(email.toLowerCase().trim() as (typeof ROUTE_SETTER_EMAILS)[number]);
}

/**
 * Verifies the request has a valid route setter session and returns the auth user.
 * Expects Authorization: Bearer <access_token>.
 */
export async function getRouteSetterFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  if (!isRouteSetterEmail(user.email)) return null;
  return user;
}
