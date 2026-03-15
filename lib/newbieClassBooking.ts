import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCoachingSlotsForDate } from "./coachingSessions";

const MAX_NEWBIES_PER_SESSION = 5;

/**
 * If the session has no coach and at least one person is signed up, assign a route setter
 * who is IN today. Picks the one with the fewest sessions already assigned today.
 */
async function tryAutoAssignCoach(
  supabase: SupabaseClient,
  sessionId: string,
  today: string
): Promise<void> {
  const { data: session } = await supabase
    .from("coaching_sessions")
    .select("id, coach_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.coach_id) return;

  const { data: staffIn } = await supabase
    .from("staff_attendance")
    .select("staff_id")
    .eq("date", today)
    .eq("status", "IN");
  const staffIds = (staffIn ?? []).map((r) => r.staff_id).filter(Boolean);
  if (staffIds.length === 0) return;

  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;
  const { data: assignedCounts } = await supabase
    .from("coaching_sessions")
    .select("coach_id")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay)
    .in("status", ["scheduled"])
    .not("coach_id", "is", null);

  const countByStaff: Record<string, number> = {};
  for (const id of staffIds) countByStaff[id] = 0;
  for (const row of assignedCounts ?? []) {
    const cid = row.coach_id as string;
    if (staffIds.includes(cid)) countByStaff[cid] = (countByStaff[cid] ?? 0) + 1;
  }

  let pickId: string | null = null;
  let minCount = Infinity;
  for (const id of staffIds) {
    const c = countByStaff[id] ?? 0;
    if (c < minCount) {
      minCount = c;
      pickId = id;
    }
  }
  if (!pickId) return;

  await supabase
    .from("coaching_sessions")
    .update({ coach_id: pickId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * After a member pays for newbie_class, assign them to the next available coaching session
 * (max 5 newbies per session; 2 sessions per 30-min slot = max 10 per slot).
 * If the session has no coach and at least one person is now signed up, a route setter
 * who is IN today is auto-assigned (one with fewest sessions today).
 * Returns the booking id or null if no slot available.
 */
export async function bookNewbieClass(
  supabase: SupabaseClient,
  memberId: string,
  paymentId: string | null
): Promise<{ bookingId: string; sessionId: string } | null> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  await ensureCoachingSlotsForDate(supabase, today);
  await ensureCoachingSlotsForDate(supabase, tomorrow);

  const { data: sessions, error: sessionsErr } = await supabase
    .from("coaching_sessions")
    .select("id, start_time, coach_id")
    .gt("start_time", now.toISOString())
    .in("status", ["scheduled"])
    .order("start_time", { ascending: true })
    .limit(100);

  if (sessionsErr || !sessions?.length) return null;

  for (const session of sessions) {
    const { count } = await supabase
      .from("newbie_class_bookings")
      .select("id", { count: "exact", head: true })
      .eq("coaching_session_id", session.id);

    if ((count ?? 0) >= MAX_NEWBIES_PER_SESSION) continue;

    const { data: inserted, error: insertErr } = await supabase
      .from("newbie_class_bookings")
      .insert({
        member_id: memberId,
        coaching_session_id: session.id,
        payment_id: paymentId,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) return null;

    if (!session.coach_id) {
      await tryAutoAssignCoach(supabase, session.id, today);
    }

    return { bookingId: inserted.id, sessionId: session.id };
  }

  return null;
}
