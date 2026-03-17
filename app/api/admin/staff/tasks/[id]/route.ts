import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessOperations } from "@/lib/unifiedAdminAuth";
import { getGymToday } from "@/lib/gymTimezone";
import { insertAdminAuditLog } from "@/lib/auditLog";

/**
 * PATCH /api/admin/staff/tasks/[id]
 * Body: { status?: "pending" | "completed" }
 * Allows staff (and admin) to mark tasks complete from Operations tab. Records task_logs and audit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || !canAccessOperations(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Task id required" }, { status: 400 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status === "completed" ? "completed" : "pending";

  const supabase = createServerClient();
  let staff: { id: string; display_name: string | null } | null = null;
  if (unified.staffId) {
    const r = await supabase.from("staff_profiles").select("id, display_name").eq("id", unified.staffId).single();
    staff = r.data;
  }
  if (!staff) {
    const r = await supabase.from("staff_profiles").select("id, display_name").eq("auth_id", unified.user.id).single();
    staff = r.data;
  }
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: task } = await supabase
    .from("staff_tasks")
    .select("id, assigned_to, status")
    .eq("id", id)
    .single();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assigned_to && task.assigned_to !== staff.id) {
    return NextResponse.json({ error: "Not assigned to you" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const today = getGymToday();

  if (status === "completed") {
    await supabase.from("task_logs").insert({
      task_id: id,
      staff_id: staff.id,
      date: today,
      completed_at: nowIso,
    });
    await insertAdminAuditLog(supabase, {
      staffId: staff.id,
      actionType: "staff_task_complete",
      entityId: id,
    });
    if (task.status !== "completed") {
      const { error: updateErr } = await supabase
        .from("staff_tasks")
        .update({ status: "completed", completed_at: nowIso, completed_by: staff.id, updated_at: nowIso })
        .eq("id", id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: updateErr } = await supabase
      .from("staff_tasks")
      .update({ status: "pending", completed_at: null, completed_by: null, updated_at: nowIso })
      .eq("id", id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status,
    completed_at: status === "completed" ? nowIso : null,
    completed_by_name: status === "completed" ? staff.display_name ?? "Staff" : null,
  });
}
