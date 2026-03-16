import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * DELETE /api/route-setter/zones/[id]/unassign
 * Removes current route setter from this zone's assignment list.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Zone id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { error: delErr } = await supabase
    .from("route_reset_assignments")
    .delete()
    .eq("zone_id", id)
    .eq("staff_id", staff.id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { data: assignments, error: loadErr } = await supabase
    .from("route_reset_assignments")
    .select("zone_id, staff_id, staff_profiles(display_name, email)")
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

