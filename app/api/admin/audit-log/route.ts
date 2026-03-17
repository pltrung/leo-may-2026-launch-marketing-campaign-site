import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * GET /api/admin/audit-log
 * Returns recent admin audit log entries (who did what, when). Admin only.
 * Query: ?limit=50 (default 100, max 200)
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || unified.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 1),
    200
  );

  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("admin_audit_log")
    .select(
      "id, staff_id, admin_auth_id, action_type, entity_id, metadata, created_at, staff_profiles(display_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (rows ?? []).map((row: Record<string, unknown>) => {
    const sp = row.staff_profiles;
    const profile = Array.isArray(sp) ? sp[0] : sp;
    const displayName =
      (profile as { display_name?: string } | null)?.display_name ?? null;
    const email = (profile as { email?: string } | null)?.email ?? null;
    return {
      id: row.id,
      staff_id: row.staff_id ?? null,
      admin_auth_id: row.admin_auth_id ?? null,
      action_type: row.action_type,
      entity_id: row.entity_id ?? null,
      metadata: row.metadata ?? null,
      created_at: row.created_at,
      actor:
        displayName || email
          ? { display_name: displayName, email }
          : row.admin_auth_id
          ? { display_name: "Admin", email: null }
          : null,
    };
  });

  return NextResponse.json({ entries });
}
