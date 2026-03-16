import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/route-setter/zones/[id]/assign
 * Assign current route setter as a setter for this zone for today.
 */
export async function POST(
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
    .select("id, display_name, email")
    .eq("auth_id", user.id)
    .single();

  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = getGymToday();

  const { error: insertErr } = await supabase
    .from("route_zone_setters")
    .insert({ zone_id: id, staff_id: staff.id, date: today })
    .onConflict("zone_id,staff_id,date")
    .ignore();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { data: assignments, error: loadErr } = await supabase
    .from("route_zone_setters")
    .select("zone_id, staff_profiles(display_name, email)")
    .eq("zone_id", id)
    .eq("date", today);

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });

  const assigned_setters =
    (assignments ?? [])
      .map((a) => {
        const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles;
        return (p?.display_name as string | null) || (p?.email as string | null);
      })
      .filter((n): n is string => !!n);

  return NextResponse.json({ ok: true, assigned_setters });
}

