import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCoachingSlotsForDate } from "./coachingSessions";

const MAX_NEWBIES_PER_SESSION = 5;

/**
 * After a member pays for newbie_class, assign them to the next available coaching session
 * (max 5 newbies per session; 2 sessions per 30-min slot = max 10 per slot).
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
    .select("id, start_time")
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
    return { bookingId: inserted.id, sessionId: session.id };
  }

  return null;
}
