import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { createQrToken } from "@/lib/qrTokens";

/**
 * GET /api/route-setter/qr-token
 * Authorization: Bearer <access_token>
 * Returns a short-lived signed QR token for the current staff member.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createServerClient();
    const { data: staff, error } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error || !staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const qrToken = createQrToken("staff", staff.id as string);
    return NextResponse.json({ token: qrToken }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Failed to create QR token" }, { status: 500 });
  }
}

