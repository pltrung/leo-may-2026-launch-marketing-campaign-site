/**
 * Unified auth for /admin: one layer that derives role from staff_profiles (or admin email).
 * Used by API routes and by the admin UI to control visibility.
 * Does not replace AdminAuthProvider or RouteSetterAuthProvider; they remain for gradual migration.
 */

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminAuth";
import { isRouteSetterEmail } from "@/lib/routeSetterAuth";

/** UI role: admin (full), frontdesk (front desk only), staff (operations + limited front desk) */
export type UnifiedRole = "admin" | "frontdesk" | "staff";

/** DB role in staff_profiles */
export type StaffProfileRole = "admin" | "frontdesk" | "route_setter" | "coach";

export interface StaffProfileRow {
  id: string;
  auth_id: string;
  email: string;
  role: StaffProfileRole;
  display_name: string | null;
  id_number?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  id_verified_from_cccd?: boolean;
  address?: string | null;
}

export interface UnifiedAdminResult {
  user: User;
  role: UnifiedRole;
  staffId: string | null;
  staffProfile: StaffProfileRow | null;
}

function mapToUnifiedRole(dbRole: string): UnifiedRole {
  switch (dbRole) {
    case "admin":
      return "admin";
    case "frontdesk":
      return "frontdesk";
    case "route_setter":
    case "coach":
    default:
      return "staff";
  }
}

/**
 * Verifies the request has a valid session for /admin and returns user + role.
 * - If email is in ADMIN_EMAILS: role = admin (optionally resolve staff_profiles for staffId).
 * - Else if staff_profiles exists for auth_id: role from staff_profiles (admin | frontdesk | staff).
 * - Else if email is in ROUTE_SETTER_EMAILS: create staff_profiles with role route_setter, return staff.
 * Otherwise returns null (401).
 */
export async function getUnifiedAdminOrStaffFromRequest(
  req: NextRequest
): Promise<UnifiedAdminResult | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user?.id) return null;

  const supabase = createServerClient();
  const email = (user.email ?? "").trim().toLowerCase();

  // 1) Admin email → always admin role (may or may not have staff_profiles row)
  if (isAdminEmail(user.email)) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id, auth_id, email, role, display_name")
      .eq("auth_id", user.id)
      .maybeSingle();
    const row = staff as StaffProfileRow | null;
    return {
      user,
      role: "admin",
      staffId: row?.id ?? null,
      staffProfile: row ?? null,
    };
  }

  // 2) Look up staff_profiles by auth_id (base columns only so /admin loads before migration 040)
  let { data: staff, error: staffErr } = await supabase
    .from("staff_profiles")
    .select("id, auth_id, email, role, display_name")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (staffErr) return null;

  const row = staff as StaffProfileRow | null;

  // 3) If no row but is route setter email → create with role route_setter (so they can use /admin as staff)
  if (!row && isRouteSetterEmail(user.email)) {
    const { data: inserted, error: insertErr } = await supabase
      .from("staff_profiles")
      .insert({
        auth_id: user.id,
        email,
        role: "route_setter",
      })
      .select("id, auth_id, email, role, display_name")
      .single();
    if (!insertErr && inserted) {
      const newRow = inserted as StaffProfileRow;
      return {
        user,
        role: "staff",
        staffId: newRow.id,
        staffProfile: newRow,
      };
    }
  }

  if (!row) return null;

  return {
    user,
    role: mapToUnifiedRole(row.role),
    staffId: row.id,
    staffProfile: row,
  };
}

/** Permission helpers for UI and API */
export function canAccessFrontDeskFull(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}

export function canAccessFrontDeskLimited(role: UnifiedRole): boolean {
  return role === "staff"; // member lookup + POS only
}

export function canAccessOperations(role: UnifiedRole): boolean {
  return role === "admin" || role === "staff";
}

/** Can see the Management area tab (admin: all sub-tabs; frontdesk: Inventory only) */
export function canAccessManagement(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}

/** Can use Inventory (stock in/out, create product, view inventory). Admin + Frontdesk. */
export function canAccessInventory(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}

export function canDoPos(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk" || role === "staff";
}

export function canDoMembershipModify(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}

export function canDoPaymentConfirm(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}

export function canAccessRevenue(role: UnifiedRole): boolean {
  return role === "admin";
}

export function canAccessAdminTools(role: UnifiedRole): boolean {
  return role === "admin";
}

export function canDoCheckIn(role: UnifiedRole): boolean {
  return role === "admin" || role === "frontdesk";
}
