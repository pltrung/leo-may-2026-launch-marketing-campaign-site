import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdminOrStaff } from "@/lib/gymOperationsAdminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("facility_maintenance_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const category = typeof body.category === "string" ? body.category.trim() || "general" : "general";
  const dueDate = typeof body.due_date === "string" && body.due_date ? body.due_date : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("facility_maintenance_tasks")
    .insert({
      title,
      description,
      category,
      due_date: dueDate,
      status: "open",
      created_by_staff_id: auth.u.staffId,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (body.status === "open" || body.status === "in_progress" || body.status === "done") {
    updates.status = body.status;
    if (body.status === "done") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }
  const { error } = await supabase.from("facility_maintenance_tasks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
