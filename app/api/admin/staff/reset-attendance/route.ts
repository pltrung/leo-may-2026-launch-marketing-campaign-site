import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/admin/staff/reset-attendance
 * Deletes all staff_attendance records for today (for testing QR check-in). Admin only.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getGymToday();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("staff_attendance")
    .delete()
    .eq("date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: `Reset attendance for ${today}` });
}
