import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay, getGymDateFromISO } from "@/lib/gymTimezone";

const STAFF_REQUIRED_DEFAULT = 3;
const GYM_TZ = "America/Los_Angeles";

type ShiftPhase = "pre_open" | "gym_open" | "closing";

/** Current time in gym TZ as HH:MM for comparison with DB time. */
function getGymNowHHMM(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: GYM_TZ,
  }).slice(0, 5);
}

function compareHHMM(a: string, b: string): number {
  const [ah, am] = a.split(":").map((n) => parseInt(n, 10) || 0);
  const [bh, bm] = b.split(":").map((n) => parseInt(n, 10) || 0);
  return (ah * 60 + am) - (bh * 60 + bm);
}

/** Determine current shift phase: 9:00–10:00 pre_open, 10:00–22:00 gym_open, 22:00–23:00 closing. */
function getCurrentPhase(): ShiftPhase {
  const t = new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: GYM_TZ,
  }).slice(0, 5);
  const [h, m] = t.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins >= 9 * 60 && mins < 10 * 60) return "pre_open";
  if (mins >= 10 * 60 && mins < 22 * 60) return "gym_open";
  if (mins >= 22 * 60 && mins < 23 * 60) return "closing";
  return "gym_open";
}

/** Minutes from midnight in gym TZ for current moment. */
function getGymMinutesFromMidnight(): number {
  const t = new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: GYM_TZ,
  }).slice(0, 5);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes until next phase (in gym TZ). */
function getMinutesUntilNextPhase(phase: ShiftPhase): number {
  const nowMins = getGymMinutesFromMidnight();
  const next: Record<ShiftPhase, number> = {
    pre_open: 10 * 60,
    gym_open: 22 * 60,
    closing: 23 * 60,
  };
  const nextMins = next[phase];
  if (nowMins < nextMins) return nextMins - nowMins;
  if (phase === "closing") return 24 * 60 - nowMins + 9 * 60;
  return 24 * 60 - nowMins + next[phase];
}

/** Human-readable countdown message. */
function getCountdownMessage(phase: ShiftPhase, minutes: number): string {
  if (phase === "pre_open") {
    if (minutes <= 0) return "Gym is opening.";
    return `Gym opens in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (phase === "gym_open") {
    if (minutes <= 0) return "Closing phase starts.";
    return `Closing in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (minutes <= 0) return "All tasks due soon.";
  return `Closing tasks due in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

/**
 * GET /api/admin/staff
 * Returns staff operations: attendance, tasks, task_logs timeline, sessions (today), zones, ops metrics.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStart = getGymStartOfDay(today);
  const todayEnd = getGymEndOfDay(today);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const [
    attendanceRes,
    sessionsNext2hRes,
    sessionsTodayRes,
    zonesRes,
    tasksRes,
    taskLogsRes,
  ] = await Promise.all([
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
      .from("coaching_sessions")
      .select("id, start_time, end_time, coach_id, session_type, status, location, staff_profiles(email, display_name)")
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .in("status", ["scheduled"])
      .order("start_time"),
    supabase
      .from("route_zones")
      .select("id, name, reset_frequency_days, last_reset_at, next_reset_at")
      .order("next_reset_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("staff_tasks")
      .select("id, title, description, block, start_time, due_time, status, completed_at, completed_by, completer:staff_profiles!completed_by(display_name, email)")
      .order("start_time", { ascending: true, nullsFirst: true }),
    supabase
      .from("task_logs")
      .select("id, task_id, staff_id, date, completed_at, staff_tasks(title), staff_profiles(display_name, email)")
      .eq("date", today)
      .order("completed_at", { ascending: true }),
  ]);

  const attendance = attendanceRes.data ?? [];
  const sessionsNext2h = sessionsNext2hRes.data ?? [];
  const sessionsToday = sessionsTodayRes.data ?? [];
  const zones = zonesRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const taskLogs = taskLogsRes.data ?? [];

  const staffIn = attendance.filter((a) => a.status === "IN");
  const staffOut = attendance.filter((a) => a.status === "NOT_IN");

  const zonesWithStatus = zones.map((z) => ({
    ...z,
    overdue: z.next_reset_at ? z.next_reset_at < nowIso : false,
  }));

  const sessionIds = sessionsNext2h.map((s) => s.id);
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
  const sessionsWithNewbieCount = sessionsNext2h.map((s) => ({
    ...s,
    location: (s.location as string) ?? "Main Wall - Beginner Area",
    newbie_count: newbieCountBySession[s.id] ?? 0,
  }));

  // Today's full sessions with location for Coaching tab
  const sessionsTodayWithLocation = sessionsToday.map((s) => ({
    ...s,
    location: (s.location as string) ?? "Main Wall - Beginner Area",
  }));

  const totalNewbieAttendance = Object.values(newbieCountBySession).reduce((a, b) => a + b, 0);

  const preOpen = tasks.filter((t) => (t as { block?: string }).block === "pre_open");
  const during = tasks.filter((t) => (t as { block?: string }).block === "during_hours");
  const closing = tasks.filter((t) => (t as { block?: string }).block === "closing");

  const preOpenCompleted = preOpen.filter((t) => t.status === "completed").length;
  const nowHHMM = getGymNowHHMM();
  const closingOverdue = closing.filter((t) => {
    if (t.status === "completed") return false;
    const due = t.due_time ? String(t.due_time).slice(0, 5) : null;
    return due ? compareHHMM(nowHHMM, due) > 0 : false;
  }).length;

  const unassignedSessions = sessionsToday.filter((s) => !s.coach_id).length;

  // Timeline: task_logs with task title and staff name (Supabase returns relations as arrays)
  const timeline = taskLogs.map((log) => {
    const task = Array.isArray(log.staff_tasks) ? log.staff_tasks[0] : log.staff_tasks;
    const profile = Array.isArray(log.staff_profiles) ? log.staff_profiles[0] : log.staff_profiles;
    return {
      id: log.id,
      completed_at: log.completed_at,
      task_title: task?.title ?? "Task",
      staff_name: profile?.display_name || profile?.email || "Staff",
    };
  });

  // Staff task performance: count completions per staff from task_logs
  const staffCompletionCount: Record<string, number> = {};
  const staffNames: Record<string, string> = {};
  for (const log of taskLogs as { staff_id: string; staff_profiles?: { display_name?: string; email?: string } | null }[]) {
    const id = log.staff_id as string;
    staffCompletionCount[id] = (staffCompletionCount[id] ?? 0) + 1;
    const p = Array.isArray(log.staff_profiles) ? log.staff_profiles[0] : log.staff_profiles;
    if (p && !staffNames[id]) staffNames[id] = p.display_name || p.email || id;
  }
  const totalTasks = tasks.length;
  const staffTaskPerformance = Object.entries(staffCompletionCount).map(([staff_id, completed]) => ({
    staff_id,
    display_name: staffNames[staff_id] ?? staff_id,
    tasks_completed: completed,
    completion_rate_pct: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
  }));

  const tasksCompleted = tasks.filter((t) => t.status === "completed").length;
  const tasksPending = tasks.filter((t) => t.status === "pending").length;
  const preOpenOverdue = preOpen.filter((t) => {
    if (t.status === "completed") return false;
    const due = t.due_time ? String(t.due_time).slice(0, 5) : null;
    return due ? compareHHMM(nowHHMM, due) > 0 : false;
  }).length;
  const duringOverdue = during.filter((t) => {
    if (t.status === "completed") return false;
    const due = t.due_time ? String(t.due_time).slice(0, 5) : null;
    return due ? compareHHMM(nowHHMM, due) > 0 : false;
  }).length;
  const tasksOverdue = preOpenOverdue + duringOverdue + closingOverdue;

  const staffRequired = STAFF_REQUIRED_DEFAULT;
  const zonesOverdueCount = zonesWithStatus.filter((z) => z.overdue).length;

  const currentPhase = getCurrentPhase();
  const minutesUntilNext = getMinutesUntilNextPhase(currentPhase);
  const phaseLabel =
    currentPhase === "pre_open" ? "Pre-Open" : currentPhase === "gym_open" ? "Gym Open" : "Closing";
  const countdownMessage = getCountdownMessage(currentPhase, minutesUntilNext);

  const blockToPhase: Record<string, ShiftPhase> = {
    pre_open: "pre_open",
    during_hours: "gym_open",
    closing: "closing",
  };
  const currentPhaseTasks = tasks.filter(
    (t) => blockToPhase[(t as { block?: string }).block ?? ""] === currentPhase
  );

  const SAFETY_TASK_TITLES = ["Inspect anchors", "Inspect crash pads", "Check rental shoes"];
  const safetyTasks = preOpen.filter((t) =>
    SAFETY_TASK_TITLES.some((title) => (t.title ?? "").trim().toLowerCase() === title.toLowerCase())
  );
  const gymReady =
    currentPhase === "pre_open" &&
    safetyTasks.length >= 3 &&
    safetyTasks.every((t) => t.status === "completed");

  const todayGym = getGymToday();
  const routeResetDay =
    zonesWithStatus.some((z) => {
      if (!z.next_reset_at) return false;
      return getGymDateFromISO(z.next_reset_at) === todayGym;
    }) || zonesOverdueCount > 0;

  return NextResponse.json({
    attendance: { in: staffIn, out: staffOut, all: attendance },
    sessions: sessionsWithNewbieCount,
    sessionsToday: sessionsTodayWithLocation,
    zones: zonesWithStatus,
    tasks,
    preOpen,
    during,
    closing,
    timeline,
    staffTaskPerformance,
    phase: {
      current_phase: currentPhase,
      phase_label: phaseLabel,
      countdown_message: countdownMessage,
      minutes_until_next_phase: minutesUntilNext,
    },
    currentPhaseTasks,
    gym_ready: gymReady,
    route_reset_day: routeResetDay,
    summary: {
      staff_in_today: staffIn.length,
      staff_out_today: staffOut.length,
      sessions_today: sessionsToday.length,
      newbie_attendance_today: totalNewbieAttendance,
      zones_overdue: zonesOverdueCount,
      tasks_pending: tasksPending,
      tasks_completed: tasksCompleted,
      tasks_overdue: tasksOverdue,
      tasks_total: totalTasks,
      pre_open_completed: preOpenCompleted,
      pre_open_total: preOpen.length,
      closing_overdue: closingOverdue,
      unassigned_sessions: unassignedSessions,
      staff_required: staffRequired,
    },
  });
}
