import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/staff
 * Returns staff operations overview: attendance today, coaching sessions, zones due, tasks.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const [attendanceRes, sessionsRes, zonesRes, tasksRes] = await Promise.all([
    supabase
      .from("staff_attendance")
      .select("id, staff_id, date, status, created_at, staff_profiles(email, display_name)")
      .eq("date", today)
      .order("status"),
    supabase
      .from("coaching_sessions")
      .select("id, start_time, end_time, coach_id, session_type, status, staff_profiles(email)")
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .in("status", ["scheduled"])
      .order("start_time"),
    supabase
      .from("route_zones")
      .select("id, name, reset_frequency_days, last_reset_at, next_reset_at")
      .order("next_reset_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("staff_tasks")
      .select("id, title, status, due_date, completed_at, staff_profiles(email)")
      .order("due_date", { ascending: true, nullsFirst: true }),
  ]);

  const attendance = attendanceRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const zones = zonesRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const now = new Date().toISOString();
  const staffIn = attendance.filter((a) => a.status === "IN");
  const staffOut = attendance.filter((a) => a.status === "NOT_IN");
  const allStaffIds = new Set(attendance.map((a) => a.staff_id));

  const zonesWithStatus = zones.map((z) => ({
    ...z,
    overdue: z.next_reset_at ? z.next_reset_at < now : false,
  }));

  return NextResponse.json({
    attendance: { in: staffIn, out: staffOut, all: attendance },
    sessions,
    zones: zonesWithStatus,
    tasks,
    summary: {
      staff_in_today: staffIn.length,
      staff_out_today: staffOut.length,
      sessions_today: sessions.length,
      zones_overdue: zonesWithStatus.filter((z) => z.overdue).length,
      tasks_pending: tasks.filter((t) => t.status === "pending").length,
    },
  });
}
