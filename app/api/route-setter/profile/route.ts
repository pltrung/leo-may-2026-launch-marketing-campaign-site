import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * PATCH /api/route-setter/profile
 * Body: { display_name?: string }
 * Updates the current staff's display name (used as coach name on dashboard and admin).
 */
export async function PATCH(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { display_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName =
    typeof body.display_name === "string"
      ? body.display_name.trim().slice(0, 120) || null
      : null;

  const supabase = createServerClient();
  const { data: staff, error: fetchErr } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (fetchErr || !staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("staff_profiles")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id)
    .select("id, email, display_name")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ staff: updated });
}
