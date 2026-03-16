import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * PATCH /api/route-setter/tasks/[id]
 * Body: { status?: "pending" | "completed" }
 * When marking completed, records completed_by and logs into task_logs.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, display_name")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: task } = await supabase
    .from("staff_tasks")
    .select("id, assigned_to")
    .eq("id", id)
    .single();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assigned_to && task.assigned_to !== staff.id) {
    return NextResponse.json({ error: "Not assigned to you" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const today = getGymToday();

  const update: { status: string; completed_at?: string; completed_by?: string | null; updated_at: string } = {
    status,
    updated_at: nowIso,
  };
  if (status === "completed") {
    update.completed_at = nowIso;
    update.completed_by = staff.id as string;
  } else {
    update.completed_by = null;
  }

  const { error } = await supabase.from("staff_tasks").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "completed") {
    await supabase.from("task_logs").insert({
      task_id: id,
      staff_id: staff.id,
      date: today,
      completed_at: nowIso,
    });
  }

  return NextResponse.json({
    ok: true,
    status,
    completed_at: status === "completed" ? nowIso : null,
    completed_by_name: status === "completed" ? staff.display_name ?? "Staff" : null,
  });
}

