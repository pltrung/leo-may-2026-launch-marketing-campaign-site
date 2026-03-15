import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * GET /api/route-setter/tasks
 * Returns staff tasks (all or filtered by due_date). For route setters we show
 * tasks that are unassigned or assigned to the current staff.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: tasks, error } = await supabase
    .from("staff_tasks")
    .select("id, title, description, assigned_to, due_date, status, completed_at")
    .or(`assigned_to.is.null,assigned_to.eq.${staff.id}`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = (tasks ?? []).filter((t) => t.status === "pending");
  const completed = (tasks ?? []).filter((t) => t.status === "completed");

  return NextResponse.json({ tasks: tasks ?? [], pending, completed });
}
