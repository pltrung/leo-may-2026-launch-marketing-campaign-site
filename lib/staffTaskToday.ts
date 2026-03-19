/**
 * Staff shift tasks: completion is tracked per gym day in task_logs.
 * staff_tasks.status / completed_at are not reliable across midnight (reset can fail without service role).
 */

export type TaskLogWithStaff = {
  task_id: string;
  staff_id?: string;
  completed_at: string;
  staff_profiles?: { display_name?: string | null; email?: string | null } | null | unknown[];
};

export type StaffTaskRow = Record<string, unknown> & {
  id: string;
  status?: string;
  completed_at?: string | null;
  completed_by?: string | null;
  completer?: unknown;
};

/** Merge DB task rows with today's task_logs so UI shows fresh daily state. */
export function mergeStaffTasksWithTodayLogs<T extends StaffTaskRow>(
  tasks: T[],
  taskLogs: TaskLogWithStaff[]
): T[] {
  const latestByTask = new Map<string, TaskLogWithStaff>();
  for (const log of taskLogs) {
    const tid = log.task_id;
    if (!tid) continue;
    const prev = latestByTask.get(tid);
    if (!prev || String(log.completed_at) > String(prev.completed_at)) {
      latestByTask.set(tid, log);
    }
  }

  return tasks.map((t) => {
    const log = latestByTask.get(t.id);
    if (log) {
      const p = Array.isArray(log.staff_profiles) ? log.staff_profiles[0] : log.staff_profiles;
      const prof = p as { display_name?: string | null; email?: string | null } | null | undefined;
      return {
        ...t,
        status: "completed",
        completed_at: log.completed_at,
        completed_by: log.staff_id ?? null,
        completer: prof ? { display_name: prof.display_name, email: prof.email } : null,
      } as T;
    }
    return {
      ...t,
      status: "pending",
      completed_at: null,
      completed_by: null,
      completer: null,
    } as T;
  });
}
