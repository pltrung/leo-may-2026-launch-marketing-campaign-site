import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * GET /api/admin/staff/profile/check-id?id_number=xxx
 * Returns { available: boolean }. True if id_number can be used by this staff (unique across member_profiles and staff_profiles, or already this staff's).
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idNumber = request.nextUrl.searchParams.get("id_number")?.trim() ?? "";
  if (!idNumber) return NextResponse.json({ available: true });

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  // Already used by this staff?
  const { data: myStaff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", staffId)
    .eq("id_number", idNumber)
    .maybeSingle();
  if (myStaff) return NextResponse.json({ available: true });

  // Used by another staff?
  const { data: otherStaff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id_number", idNumber)
    .limit(1)
    .maybeSingle();
  if (otherStaff) return NextResponse.json({ available: false });

  // Used by any member?
  const { data: member } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("id_number", idNumber)
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ available: !member });
}
