import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * GET /api/route-setter/me
 * Authorization: Bearer <access_token>
 * Returns or creates staff_profiles row for the authenticated route setter.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const email = user.email?.trim().toLowerCase() ?? "";

  let { data: staff, error } = await supabase
    .from("staff_profiles")
    .select("id, auth_id, email, role, display_name")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!error && !staff) {
    const { data: inserted, error: insertErr } = await supabase
      .from("staff_profiles")
      .insert({
        auth_id: user.id,
        email,
        role: "route_setter",
      })
      .select("id, auth_id, email, role, display_name")
      .single();
    if (!insertErr && inserted) staff = inserted;
  }

  if (error) return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  if (!staff) return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });

  return NextResponse.json({ staff }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
