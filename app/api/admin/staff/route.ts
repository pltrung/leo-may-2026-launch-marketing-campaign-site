import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * GET /api/admin/staff
 * Returns staff operations overview: attendance today, coaching sessions, zones due, tasks.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const now = new Date();
  const nowIso = now.toISOString();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const [attendanceRes, sessionsRes, zonesRes, tasksRes] = await Promise.all([
    supabase
      .from("staff_attendance")
      .select("id, staff_id, date, status, created_at, staff_profiles(email, display_name)")
      .eq("date", today)
      .order("status"),
    supabase
      .from("coaching_sessions")
      .select("id, start_time, end_time, coach_id, session_type, status, location, staff_profiles(email, display_name)")
      .gt("start_time", nowIso)
      .lte("start_time", twoHoursLater)
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

  const staffIn = attendance.filter((a) => a.status === "IN");
  const staffOut = attendance.filter((a) => a.status === "NOT_IN");

  const zonesWithStatus = zones.map((z) => ({
    ...z,
    overdue: z.next_reset_at ? z.next_reset_at < nowIso : false,
  }));

  const sessionIds = sessions.map((s) => s.id);
  const newbieCountBySession: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: bookings } = await supabase
      .from("newbie_class_bookings")
      .select("coaching_session_id")
      .in("coaching_session_id", sessionIds);
    for (const b of bookings ?? []) {
      const id = b.coaching_session_id as string;
      newbieCountBySession[id] = (newbieCountBySession[id] ?? 0) + 1;
    }
  }
  const sessionsWithNewbieCount = sessions.map((s) => ({
    ...s,
    location: (s.location as string) ?? "Main Wall - Beginner Area",
    newbie_count: newbieCountBySession[s.id] ?? 0,
  }));

  const totalNewbieAttendance = Object.values(newbieCountBySession).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    attendance: { in: staffIn, out: staffOut, all: attendance },
    sessions: sessionsWithNewbieCount,
    zones: zonesWithStatus,
    tasks,
    summary: {
      staff_in_today: staffIn.length,
      staff_out_today: staffOut.length,
      sessions_today: sessions.length,
      newbie_attendance_today: totalNewbieAttendance,
      zones_overdue: zonesWithStatus.filter((z) => z.overdue).length,
      tasks_pending: tasks.filter((t) => t.status === "pending").length,
    },
  });
}
