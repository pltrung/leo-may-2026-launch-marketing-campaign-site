import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/admin/staff/reset-attendance
 * Deletes all staff_attendance records for today and resets daily staff_tasks (due today or no due_date)
 * so staff see tasks as pending again. For testing QR check-in. Admin only.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getGymToday();
  const supabase = createServerClient();

  const { error: attendanceErr } = await supabase
    .from("staff_attendance")
    .delete()
    .eq("date", today);

  if (attendanceErr) return NextResponse.json({ error: attendanceErr.message }, { status: 500 });

  // Reset daily tasks: set status = pending, completed_at = null for tasks due today or with no due_date
  const { error: tasksErr } = await supabase
    .from("staff_tasks")
    .update({ status: "pending", completed_at: null, updated_at: new Date().toISOString() })
    .or(`due_date.eq.${today},due_date.is.null`);

  if (tasksErr) {
    // Log but don't fail the request; attendance reset already succeeded
    return NextResponse.json({
      ok: true,
      message: `Reset attendance for ${today}. Task reset had an issue: ${tasksErr.message}`,
    });
  }

  return NextResponse.json({ ok: true, message: `Reset attendance and daily tasks for ${today}` });
}
