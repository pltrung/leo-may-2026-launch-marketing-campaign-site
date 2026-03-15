import type { SupabaseClient } from "@supabase/supabase-js";

const SLOT_TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];
const MAX_SESSIONS_PER_SLOT = 2;
const DEFAULT_LOCATION = "Main Wall - Beginner Area";

/**
 * Ensures coaching session slots exist for a given date (YYYY-MM-DD): up to 2 rows per 30-min slot.
 */
export async function ensureCoachingSlotsForDate(supabase: SupabaseClient, dateStr: string): Promise<void> {
  for (const time of SLOT_TIMES) {
    const [h, m] = time.split(":").map(Number);
    const startTime = new Date(Date.UTC(
      new Date(dateStr + "Z").getUTCFullYear(),
      new Date(dateStr + "Z").getUTCMonth(),
      new Date(dateStr + "Z").getUTCDate(),
      h,
      m,
      0,
      0
    ));
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();

    const { count } = await supabase
      .from("coaching_sessions")
      .select("id", { count: "exact", head: true })
      .eq("start_time", startIso)
      .in("status", ["scheduled"]);

    const toInsert = MAX_SESSIONS_PER_SLOT - (count ?? 0);
    if (toInsert <= 0) continue;

    for (let i = 0; i < toInsert; i++) {
      await supabase.from("coaching_sessions").insert({
        start_time: startIso,
        end_time: endIso,
        session_type: "beginner",
        status: "scheduled",
        location: DEFAULT_LOCATION,
      });
    }
  }
}

/**
 * Ensures today's coaching session slots exist: up to 2 rows per 30-min slot (09:00–21:00).
 */
export async function ensureTodayCoachingSlots(supabase: SupabaseClient): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await ensureCoachingSlotsForDate(supabase, today);
}

export { DEFAULT_LOCATION };
