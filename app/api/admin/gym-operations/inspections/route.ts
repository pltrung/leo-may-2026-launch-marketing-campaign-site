import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdminOrStaff } from "@/lib/gymOperationsAdminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("equipment_inspection_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const inspectionType =
    typeof body.inspection_type === "string" && body.inspection_type.trim()
      ? body.inspection_type.trim()
      : "daily_mats";
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const checklist = body.checklist && typeof body.checklist === "object" ? body.checklist : null;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("equipment_inspection_logs")
    .insert({
      inspection_type: inspectionType,
      notes,
      checklist,
      checked_by_staff_id: auth.u.staffId,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Failed to log inspection" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
