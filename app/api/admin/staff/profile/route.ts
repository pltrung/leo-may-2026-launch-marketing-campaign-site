import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * PATCH /api/admin/staff/profile
 * Body: { display_name?: string }
 * Updates the current staff's display name. Allowed when user has staff profile (staff or frontdesk with staffId).
 */
export async function PATCH(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: updated, error: updateErr } = await supabase
    .from("staff_profiles")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .select("id, email, display_name")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ staff: updated });
}
