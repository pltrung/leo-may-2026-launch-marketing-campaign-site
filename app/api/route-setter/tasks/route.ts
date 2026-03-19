import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday } from "@/lib/gymTimezone";

type ShiftBlock = "pre_open" | "during_hours" | "closing";
type TaskStatus = "upcoming" | "pending" | "completed" | "overdue";

function getGymNowHHMM(): string {
  const now = new Date();
  const parts = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
  return parts.slice(0, 5); // HH:MM
}

function compareHHMM(a: string, b: string): number {
  // returns a - b in minutes
  const [ah, am] = a.split(":").map((n) => parseInt(n, 10) || 0);
  const [bh, bm] = b.split(":").map((n) => parseInt(n, 10) || 0);
  return (ah * 60 + am) - (bh * 60 + bm);
}

/**
 * GET /api/route-setter/tasks
 * Returns today's shift tasks for staff, with computed status:
 * - upcoming (before start_time)
 * - pending (between start_time and due_time, not completed)
 * - overdue (after due_time, not completed)
 * - completed (completed_at set)
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, display_name")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: tasks, error } = await supabase
    .from("staff_tasks")
    .select("id, title, description, block, start_time, due_time, status, completed_at, completed_by, priority, estimated_duration_minutes, guidance")
    .order("start_time", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch task_logs for today: completers per task + team completions (staff_name, task_title, timestamp)
  const { data: logs } = await supabase
    .from("task_logs")
    .select("task_id, staff_id, completed_at, staff_profiles(display_name, email), staff_tasks(title)")
    .eq("date", today)
    .order("completed_at", { ascending: false });

  const completersByTaskId: Record<string, string[]> = {};
  const latestCompletedAtByTask: Record<string, string> = {};
  const teamCompletions: { staff_name: string; task_title: string; completed_at: string }[] = [];
  for (const log of logs ?? []) {
    const taskId = log.task_id as string;
    const at = log.completed_at as string;
    if (!latestCompletedAtByTask[taskId] || at > latestCompletedAtByTask[taskId]) {
      latestCompletedAtByTask[taskId] = at;
    }
    const p = Array.isArray(log.staff_profiles) ? log.staff_profiles[0] : log.staff_profiles;
    const name = (p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email || "Staff";
    if (!completersByTaskId[taskId]) completersByTaskId[taskId] = [];
    completersByTaskId[taskId].push(name);
    const taskRow = Array.isArray(log.staff_tasks) ? log.staff_tasks[0] : log.staff_tasks;
    const taskTitle = (taskRow as { title?: string })?.title ?? "Task";
    teamCompletions.push({ staff_name: name, task_title: taskTitle, completed_at: log.completed_at as string });
  }

  const nowHHMM = getGymNowHHMM();

  const withStatus = (tasks ?? []).map((t) => {
    const completers = completersByTaskId[t.id as string] ?? [];
    const hasCompletion = completers.length > 0;
    let computed: TaskStatus;
    if (hasCompletion) {
      computed = "completed";
    } else if (!t.start_time || !t.due_time) {
      computed = "pending";
    } else {
      const start = String(t.start_time).slice(0, 5);
      const due = String(t.due_time).slice(0, 5);
      if (compareHHMM(nowHHMM, start) < 0) {
        computed = "upcoming";
      } else if (compareHHMM(nowHHMM, due) <= 0) {
        computed = "pending";
      } else {
        computed = "overdue";
      }
    }
    return {
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      block: (t.block as ShiftBlock) ?? "during_hours",
      start_time: t.start_time as string | null,
      due_time: t.due_time as string | null,
      status: computed,
      completed_at: latestCompletedAtByTask[t.id as string] ?? null,
      completed_by_name: hasCompletion ? completers[0] ?? staff.display_name ?? "Staff" : null,
      completers,
      priority: (t.priority as "high" | "medium" | "low") ?? "medium",
      estimated_duration_minutes: (t.estimated_duration_minutes as number | null) ?? null,
      guidance: (t.guidance as string | null) ?? null,
    };
  });

  const preOpen = withStatus.filter((t) => t.block === "pre_open");
  const during = withStatus.filter((t) => t.block === "during_hours");
  const closing = withStatus.filter((t) => t.block === "closing");

  return NextResponse.json({ tasks: withStatus, preOpen, during, closing, teamCompletions });
}

