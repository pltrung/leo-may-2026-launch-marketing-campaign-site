import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { createQrToken } from "@/lib/qrTokens";

/**
 * GET /api/admin/staff/qr-token
 * Returns a short-lived signed QR token for the current staff (for shift check-in at front desk).
 * Allowed: staff or admin with staffId (or any role that can access operations and has staff profile).
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let staffId = unified.staffId;
  if (!staffId) {
    const supabase = createServerClient();
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  try {
    const qrToken = createQrToken("staff", staffId as string);
    return NextResponse.json({ token: qrToken }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Failed to create QR token" }, { status: 500 });
  }
}
