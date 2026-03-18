import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessOperations } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay, getGymDateFromISO, parseGymDateTime } from "@/lib/gymTimezone";

const STAFF_REQUIRED_DEFAULT = 3;
const GYM_TZ = "America/Los_Angeles";

type ShiftPhase = "closed" | "pre_open" | "gym_open" | "closing";

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

const MAX_NEWBIES_PER_COACHING_SLOT = 5;

type CoachingSessionRow = {
  id: string;
  start_time: string;
  end_time?: string;
  coach_id: string | null;
  session_type?: string;
  status?: string;
  location?: string | null;
  staff_profiles?: unknown;
};

/** Merge rows that share the same slot (same start_time + location) so UI shows one row + total newbies. */
function aggregateNewbieSessionsBySlot(
  sessions: CoachingSessionRow[],
  newbieCountBySession: Record<string, number>
): Array<
  CoachingSessionRow & {
    newbie_count: number;
    session_ids: string[];
    max_newbies: number;
  }
> {
  const map = new Map<
    string,
    CoachingSessionRow & { newbie_count: number; session_ids: string[]; max_newbies: number }
  >();
  for (const s of sessions) {
    const n = newbieCountBySession[s.id] ?? 0;
    if (n <= 0) continue;
    const loc = (s.location as string) ?? "Main Wall - Beginner Area";
    const key = `${s.start_time}\0${loc}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        ...s,
        location: loc,
        newbie_count: n,
        session_ids: [s.id],
        max_newbies: MAX_NEWBIES_PER_COACHING_SLOT,
      });
    } else {
      prev.newbie_count += n;
      prev.session_ids.push(s.id);
      if (!prev.coach_id && s.coach_id) {
        prev.coach_id = s.coach_id;
        prev.staff_profiles = s.staff_profiles;
        prev.id = s.id;
        prev.end_time = s.end_time ?? prev.end_time;
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
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

/** Determine current shift phase in gym TZ.
 *  00:00–06:00 → closed; 06:00–10:00 → pre_open; 10:00–22:00 → gym_open; 22:00–24:00 → closing.
 */
function getCurrentPhase(): ShiftPhase {
  const mins = getGymMinutesFromMidnight();
  if (mins < 6 * 60) return "closed";
  if (mins < 10 * 60) return "pre_open";
  if (mins < 22 * 60) return "gym_open";
  return "closing";
}

/** Minutes until next phase (in gym TZ). */
function getMinutesUntilNextPhase(phase: ShiftPhase): number {
  const nowMins = getGymMinutesFromMidnight();
  if (phase === "closed") return 6 * 60 - nowMins;
  if (phase === "pre_open") return 10 * 60 - nowMins;
  if (phase === "gym_open") return 22 * 60 - nowMins;
  return 24 * 60 - nowMins + 6 * 60;
}

/** Human-readable countdown message. */
function getCountdownMessage(phase: ShiftPhase, minutes: number): string {
  if (phase === "closed") {
    if (minutes <= 0) return "Pre-open soon.";
    return `Opens at 6AM (${minutes} min)`;
  }
  if (phase === "pre_open") {
    if (minutes <= 0) return "Gym is opening.";
    return `Gym opens in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (phase === "gym_open") {
    if (minutes <= 0) return "Closing phase starts.";
    return `Closing in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (minutes <= 0) return "Closed after tasks.";
  return `Closing tasks due in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

/**
 * GET /api/admin/staff
 * Returns staff operations: attendance, tasks, sessions (today), zones, etc.
 * Allowed: admin, staff (Operations tab).
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || !canAccessOperations(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const now = new Date();
  const nowIso = now.toISOString();
  const openStartIso = parseGymDateTime(today, "10:00");
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
    resetTrackerRes,
    zoneSettersRes,
    routeSetterListRes,
    staffCountRes,
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
      .gte("start_time", openStartIso)
      .lte("start_time", twoHoursLater)
      .in("status", ["scheduled"])
      .order("start_time"),
    supabase
      .from("coaching_sessions")
      .select("id, start_time, end_time, coach_id, session_type, status, location, staff_profiles(email, display_name)")
      .gte("start_time", openStartIso)
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
    supabase.from("staff_daily_reset").select("last_reset_date").maybeSingle(),
    supabase
      .from("route_reset_assignments")
      .select("zone_id, staff_id, assigned_at, staff_profiles(display_name, email)")
      .order("assigned_at", { ascending: true }),
    supabase
      .from("staff_profiles")
      .select("id, display_name, email, role")
      .order("display_name", { ascending: true }),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true }),
  ]);

  const attendance = attendanceRes.data ?? [];
  const sessionsNext2h = sessionsNext2hRes.data ?? [];
  const sessionsToday = sessionsTodayRes.data ?? [];
  const zones = zonesRes.data ?? [];
  let tasks = tasksRes.data ?? [];
  const taskLogs = taskLogsRes.data ?? [];
  const zoneSetterRows = (zoneSettersRes.data ?? []) as {
    zone_id: string;
    staff_id?: string | null;
    assigned_at?: string | null;
    staff_profiles:
      | { display_name?: string | null; email?: string | null }
      | { display_name?: string | null; email?: string | null }[]
      | null;
  }[];

  // When the gym date rolls over (midnight), reset staff_tasks so alerts/overview show a fresh day.
  // Only advance last_reset_date after the tasks update succeeds, so we don't mark "reset done" if it failed.
  const lastResetDate = resetTrackerRes.data?.last_reset_date ?? null;
  if (!lastResetDate || today > lastResetDate) {
    const { error: tasksUpdateError } = await supabase
      .from("staff_tasks")
      .update({ status: "pending", completed_at: null, completed_by: null });
    if (!tasksUpdateError) {
      await supabase.from("staff_daily_reset").upsert({ id: 1, last_reset_date: today }, { onConflict: "id" });
      tasks = tasks.map((t) => ({ ...t, status: "pending", completed_at: null, completed_by: null }));
    }
  }

  const staffIn = attendance.filter((a) => a.status === "IN");
  const staffOut = attendance.filter((a) => a.status === "NOT_IN");
  const routeSetters = (routeSetterListRes.data ?? []).filter((p) => (p.role as string | null) === "route_setter");

  const zonesWithStatus = zones.map((z) => {
    const assigned_setters = zoneSetterRows
      .filter((row) => row.zone_id === z.id)
      .map((row) => {
        const p = Array.isArray(row.staff_profiles) ? row.staff_profiles[0] : row.staff_profiles;
        const name = (p?.display_name as string | null) || (p?.email as string | null);
        return name && row.staff_id ? { staff_id: row.staff_id, name } : null;
      })
      .filter((x): x is { staff_id: string; name: string } => !!x);

    const routeAgeDays = z.last_reset_at
      ? Math.max(0, Math.floor((Date.now() - new Date(z.last_reset_at).getTime()) / (24 * 60 * 60 * 1000)))
      : null;
    const completedToday = z.last_reset_at ? getGymDateFromISO(z.last_reset_at) === today : false;
    let reset_status: "pending" | "in_progress" | "completed" | "overdue" = assigned_setters.length > 0 ? "in_progress" : "pending";
    if (completedToday) reset_status = "completed";
    else if (z.next_reset_at && z.next_reset_at < nowIso) reset_status = "overdue";

    return {
      ...z,
      overdue: z.next_reset_at ? z.next_reset_at < nowIso : false,
      route_age_days: routeAgeDays,
      reset_status,
      assigned_setters,
    };
  });

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
  const sessionsWithNewbieCount = aggregateNewbieSessionsBySlot(
    sessionsNext2h as CoachingSessionRow[],
    newbieCountBySession
  );

  // Booking count for today's sessions (for unassigned-alert: only alert when someone is registered but no coach)
  const sessionIdsToday = sessionsToday.map((s) => s.id);
  const newbieCountBySessionToday: Record<string, number> = {};
  if (sessionIdsToday.length > 0) {
    const { data: bookingsToday } = await supabase
      .from("newbie_class_bookings")
      .select("coaching_session_id")
      .in("coaching_session_id", sessionIdsToday);
    for (const b of bookingsToday ?? []) {
      const id = b.coaching_session_id as string;
      newbieCountBySessionToday[id] = (newbieCountBySessionToday[id] ?? 0) + 1;
    }
  }

  // Today's coaching slots: one row per 30-min wall slot, merged member counts
  const sessionsTodayWithLocation = aggregateNewbieSessionsBySlot(
    sessionsToday as CoachingSessionRow[],
    newbieCountBySessionToday
  );

  const totalNewbieAttendance = Object.values(newbieCountBySessionToday).reduce((a, b) => a + b, 0);

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

  const unassignedSessions = sessionsTodayWithLocation.filter((s) => !s.coach_id && s.newbie_count > 0).length;

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
  const staffTotal = typeof staffCountRes.count === "number" ? staffCountRes.count : staffIn.length + staffOut.length;
  const zonesOverdueCount = zonesWithStatus.filter((z) => z.overdue).length;

  const currentPhase = getCurrentPhase();
  const minutesUntilNext = getMinutesUntilNextPhase(currentPhase);
  const phaseLabel =
    currentPhase === "closed" ? "Closed" : currentPhase === "pre_open" ? "Pre-Open" : currentPhase === "gym_open" ? "Gym Open" : "Closing";
  const countdownMessage = getCountdownMessage(currentPhase, minutesUntilNext);

  const blockToPhase: Record<string, ShiftPhase> = {
    pre_open: "pre_open",
    during_hours: "gym_open",
    closing: "closing",
  };
  const currentPhaseTasks =
    currentPhase === "closed"
      ? []
      : tasks.filter((t) => blockToPhase[(t as { block?: string }).block ?? ""] === currentPhase);

  const SAFETY_TASK_TITLES = ["Inspect anchors", "Inspect crash pads", "Check rental shoes"];
  const safetyTasks = preOpen.filter((t) =>
    SAFETY_TASK_TITLES.some((title) => (t.title ?? "").trim().toLowerCase() === title.toLowerCase())
  );
  const gymReady =
    currentPhase === "closed"
      ? false
      : currentPhase === "pre_open"
      ? safetyTasks.length >= 3 && safetyTasks.every((t) => t.status === "completed")
      : currentPhase === "gym_open" || currentPhase === "closing";

  const readyToClose =
    (currentPhase === "closing" || currentPhase === "closed") &&
    closing.length > 0 &&
    closing.every((t) => t.status === "completed");

  const todayGym = getGymToday();
  const routeResetDay =
    zonesWithStatus.some((z) => {
      if (!z.next_reset_at) return false;
      return getGymDateFromISO(z.next_reset_at) === todayGym;
    }) || zonesOverdueCount > 0;

  const myAttendanceRecord = unified.staffId
    ? attendance.find((a) => (a as { staff_id?: string }).staff_id === unified.staffId)
    : null;
  const myAttendance = myAttendanceRecord
    ? { date: (myAttendanceRecord as { date?: string }).date ?? today, status: (myAttendanceRecord as { status?: string }).status ?? "IN" }
    : null;

  return NextResponse.json({
    attendance: { in: staffIn, out: staffOut, all: attendance },
    myAttendance: unified.staffId ? myAttendance : undefined,
    sessions: sessionsWithNewbieCount,
    sessionsToday: sessionsTodayWithLocation,
    zones: zonesWithStatus,
    tasks,
    preOpen,
    during,
    closing,
    timeline,
    staffTaskPerformance,
    route_setters: routeSetters,
    phase: {
      current_phase: currentPhase,
      phase_label: phaseLabel,
      countdown_message: countdownMessage,
      minutes_until_next_phase: minutesUntilNext,
    },
    currentPhaseTasks,
    gym_ready: gymReady,
    ready_to_close: readyToClose,
    route_reset_day: routeResetDay,
    summary: {
      staff_in_today: staffIn.length,
      staff_out_today: staffOut.length,
      staff_total: staffTotal,
      sessions_today: sessionsTodayWithLocation.length,
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
