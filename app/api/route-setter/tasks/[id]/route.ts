import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * PATCH /api/route-setter/tasks/[id]
 * Body: { status?: "pending" | "completed" }
 * Updates task status. Setting status to "completed" sets completed_at.
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
    .select("id")
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

  const update: { status: string; completed_at?: string; updated_at: string } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase.from("staff_tasks").update(update).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
