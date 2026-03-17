import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/admin/staff/reset-attendance
 * Deletes all staff_attendance records for today and resets daily staff_tasks (due today or no due_date)
 * so staff see tasks as pending again. For testing QR check-in. Admin only.
 */
export async function POST(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || unified.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getGymToday();
  const supabase = createServerClient();

  const { error: attendanceErr } = await supabase
    .from("staff_attendance")
    .delete()
    .eq("date", today);

  if (attendanceErr) return NextResponse.json({ error: attendanceErr.message }, { status: 500 });

  // Reset daily shift tasks: set status = pending, completed_at = null, completed_by = null
  // (works for both due_date-based and block/start_time/due_time-based tasks)
  const { error: tasksErr } = await supabase
    .from("staff_tasks")
    .update({ status: "pending", completed_at: null, completed_by: null, updated_at: new Date().toISOString() })
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
