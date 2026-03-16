import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { performCheckIn } from "@/app/api/checkin/route";
import { insertAdminAuditLog, getStaffIdFromAuthId } from "@/lib/auditLog";

/**
 * POST /api/admin/checkin
 * Body: { member_id: string, location?: string }
 * Performs member check-in (same as public /api/checkin) and logs audit with admin/staff id.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { member_id?: string; location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : null;
  const location = typeof body.location === "string" ? body.location.trim() || null : null;

  if (!memberId) return NextResponse.json({ error: "member_id required" }, { status: 400 });

  const res = await performCheckIn(memberId, location);
  if (res.status === 200) {
    try {
      const supabase = createServerClient();
      const staffId = await getStaffIdFromAuthId(supabase, admin.id);
      await insertAdminAuditLog(supabase, {
        adminAuthId: admin.id,
        staffId,
        actionType: "member_checkin",
        entityId: memberId,
        metadata: location ? { location } : undefined,
      });
    } catch {
      // non-fatal
    }
  }
  return res;
}
