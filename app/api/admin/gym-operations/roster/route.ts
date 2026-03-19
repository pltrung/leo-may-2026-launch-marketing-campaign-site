import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdminOrStaff } from "@/lib/gymOperationsAdminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const includeStaff = req.nextUrl.searchParams.get("include_staff") === "1";
  const supabase = createServerClient();
  let q = supabase
    .from("staff_shift_roster")
    .select("id, staff_id, roster_date, shift_label, notes, created_at")
    .order("roster_date", { ascending: true })
    .limit(200);
  if (from) q = q.gte("roster_date", from);
  if (to) q = q.lte("roster_date", to);
  const [{ data, error }, staffRes] = await Promise.all([
    q,
    includeStaff
      ? supabase.from("staff_profiles").select("id, display_name, email, role").order("display_name", { ascending: true })
      : Promise.resolve({ data: null as null, error: null }),
  ]);
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({
    shifts: data ?? [],
    staff_directory: includeStaff ? (staffRes.data ?? []) : undefined,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const staffId = typeof body.staff_id === "string" ? body.staff_id.trim() : "";
  const rosterDate = typeof body.roster_date === "string" ? body.roster_date.trim() : "";
  const shiftLabel = typeof body.shift_label === "string" ? body.shift_label.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if (!staffId || !rosterDate || !shiftLabel) {
    return NextResponse.json({ error: "staff_id, roster_date, shift_label required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff_shift_roster")
    .upsert(
      { staff_id: staffId, roster_date: rosterDate, shift_label: shiftLabel, notes },
      { onConflict: "staff_id,roster_date,shift_label" }
    )
    .select("id")
    .single();
  if (error) {
    console.error("roster upsert", error);
    return NextResponse.json({ error: "Failed to save shift" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase.from("staff_shift_roster").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
