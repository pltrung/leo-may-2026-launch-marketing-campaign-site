import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * PUT /api/admin/routes/zones/[id]/assignments
 * Body: { staff_ids: string[] }
 * Replaces the assignment list for a zone.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Zone id required" }, { status: 400 });

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const staff_ids = (body as { staff_ids?: unknown })?.staff_ids;
  if (!Array.isArray(staff_ids)) return NextResponse.json({ error: "staff_ids required" }, { status: 400 });
  const desired = staff_ids.map(String).filter(Boolean);

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("route_reset_assignments")
    .select("staff_id")
    .eq("zone_id", id);

  const existingIds = new Set((existing ?? []).map((r) => r.staff_id as string));
  const desiredIds = new Set(desired);

  const toDelete: string[] = [];
  existingIds.forEach((sid) => {
    if (!desiredIds.has(sid)) toDelete.push(sid);
  });
  const toInsert = desired.filter((sid) => !existingIds.has(sid));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("route_reset_assignments")
      .delete()
      .eq("zone_id", id)
      .in("staff_id", toDelete);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("route_reset_assignments").insert(
      toInsert.map((sid) => ({ zone_id: id, staff_id: sid }))
    );
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { data: assignments, error: loadErr } = await supabase
    .from("route_reset_assignments")
    .select("zone_id, staff_id, assigned_at, staff_profiles(display_name, email)")
    .eq("zone_id", id)
    .order("assigned_at", { ascending: true });
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });

  const assigned_setters =
    (assignments ?? [])
      .map((a) => {
        const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles;
        const name = (p?.display_name as string | null) || (p?.email as string | null);
        return name ? { staff_id: a.staff_id as string, name } : null;
      })
      .filter((x): x is { staff_id: string; name: string } => !!x);

  return NextResponse.json({ ok: true, assigned_setters });
}

