import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessOperations } from "@/lib/unifiedAdminAuth";
import { insertAdminAuditLog } from "@/lib/auditLog";

/**
 * POST /api/admin/routes/zones/[id]/reset
 * Marks the route zone as reset + logs completion + clears assignments. Allowed: admin, staff.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || !canAccessOperations(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Zone id required" }, { status: 400 });

  const supabase = createServerClient();
  let staffIdForAudit: string | null = unified.staffId ?? null;
  if (!staffIdForAudit) {
    const { data: sp } = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).maybeSingle();
    staffIdForAudit = sp?.id ?? null;
  }

  const { data: zone, error: fetchErr } = await supabase
    .from("route_zones")
    .select("id, reset_frequency_days")
    .eq("id", id)
    .single();

  if (fetchErr || !zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setDate(nextReset.getDate() + (zone.reset_frequency_days ?? 14));

  const { error: updateErr } = await supabase
    .from("route_zones")
    .update({
      last_reset_at: now.toISOString(),
      next_reset_at: nextReset.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await supabase.from("route_reset_logs").insert({
    zone_id: id,
    completed_by: staffIdForAudit,
    completed_at: now.toISOString(),
  });
  await supabase.from("route_reset_assignments").delete().eq("zone_id", id);

  await insertAdminAuditLog(supabase, {
    adminAuthId: unified.user.id,
    staffId: staffIdForAudit,
    actionType: "route_reset_complete",
    entityId: id,
  });

  return NextResponse.json({
    ok: true,
    last_reset_at: now.toISOString(),
    next_reset_at: nextReset.toISOString(),
  });
}

