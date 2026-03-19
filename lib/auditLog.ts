/**
 * Lightweight audit logging for admin actions.
 * Logs: staff_id, action_type, entity_id, timestamp (and optional metadata).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditActionType =
  | "member_checkin"
  | "membership_extend"
  | "membership_cancel"
  | "membership_upgrade"
  | "inventory_stock_in"
  | "inventory_stock_out"
  | "route_reset_complete"
  | "staff_task_complete"
  | "staff_checkin"
  | "payment_adjustment"
  | "facility_incident"
  | "shift_close";

export interface AuditLogEntry {
  adminAuthId?: string | null;
  staffId?: string | null;
  actionType: AuditActionType;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Insert one row into admin_audit_log. Does not throw; logs errors to console.
 */
export async function insertAdminAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_auth_id: entry.adminAuthId ?? null,
      staff_id: entry.staffId ?? null,
      action_type: entry.actionType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    console.error("audit log insert failed", e);
  }
}

/**
 * Resolve staff_id from admin auth user id (auth.uid).
 */
export async function getStaffIdFromAuthId(
  supabase: SupabaseClient,
  authId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}
