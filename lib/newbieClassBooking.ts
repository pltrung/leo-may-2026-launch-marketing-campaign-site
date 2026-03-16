import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_NEWBIES_PER_SESSION = 5;
const MAX_SESSIONS_PER_SLOT = 2; // 2 sessions x 5 newbies = 10 per 30-min slot
const SLOT_LENGTH_MINUTES = 30;

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
 * After a member pays for newbie_class, create/assign them into a 30-min coaching session bucket.
 * Behaviour:
 * - Slot is determined by purchase time: round up to the next :00 or :30 (e.g. buy at 11:45 → 12:00 slot).
 * - Each 30-min slot can have up to 2 sessions, each with max 5 newbies (total 10 per slot).
 * - Sessions are created on demand only when there is at least one booking.
 * - If the chosen slot is full (2 sessions x 5 newbies), it rolls forward to the next 30‑min slot.
 * - If the session has no coach and at least one person is now signed up, a route setter
 *   who is IN today is auto-assigned (one with fewest sessions today).
 * Returns the booking id and session id, or null if no slot available.
 */
export async function bookNewbieClass(
  supabase: SupabaseClient,
  memberId: string,
  paymentId: string | null
): Promise<{ bookingId: string; sessionId: string } | null> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Helper: get next 30-min slot start (rounded up from now)
  const getNextSlotStart = (from: Date): Date => {
    const d = new Date(from.getTime());
    const minutes = d.getMinutes();
    const addMinutes = minutes === 0 || minutes === 30 ? 0 : minutes < 30 ? 30 - minutes : 60 - minutes;
    if (addMinutes > 0) d.setMinutes(minutes + addMinutes, 0, 0);
    return d;
  };

  let slotStart = getNextSlotStart(now);

  // Try this slot and a bounded number of future slots (e.g. next 12 = 6 hours) to avoid infinite loops
  for (let attempt = 0; attempt < 12; attempt++) {
    const slotEnd = new Date(slotStart.getTime() + SLOT_LENGTH_MINUTES * 60 * 1000);
    const startIso = slotStart.toISOString();
    const endIso = slotEnd.toISOString();

    // Load or lazily create up to MAX_SESSIONS_PER_SLOT sessions for this exact slot
    const { data: existingSessions, error: sessionsErr } = await supabase
      .from("coaching_sessions")
      .select("id, start_time, end_time, coach_id")
      .eq("start_time", startIso)
      .in("status", ["scheduled"])
      .order("id", { ascending: true });

    if (sessionsErr) return null;

    const sessions = [...(existingSessions ?? [])];

    if (sessions.length < MAX_SESSIONS_PER_SLOT) {
      const { data: inserted } = await supabase
        .from("coaching_sessions")
        .insert({
          start_time: startIso,
          end_time: endIso,
          session_type: "beginner",
          status: "scheduled",
          location: "Main Wall - Beginner Area",
        })
        .select("id, start_time, end_time, coach_id")
        .single();
      if (inserted) sessions.push(inserted);
    }

    // Try to place the booking into one of this slot's sessions
    for (const session of sessions) {
      const { count } = await supabase
        .from("newbie_class_bookings")
        .select("id", { count: "exact", head: true })
        .eq("coaching_session_id", session.id);

      if ((count ?? 0) >= MAX_NEWBIES_PER_SESSION) continue;

      const { data: insertedBooking, error: insertErr } = await supabase
        .from("newbie_class_bookings")
        .insert({
          member_id: memberId,
          coaching_session_id: session.id,
          payment_id: paymentId,
        })
        .select("id")
        .single();

      if (insertErr || !insertedBooking) return null;

      if (!session.coach_id) {
        await tryAutoAssignCoach(supabase, session.id, today);
      }

      return { bookingId: insertedBooking.id, sessionId: session.id };
    }

    // Slot full (2 sessions x 5 newbies) — move to next 30-min slot
    slotStart = new Date(slotStart.getTime() + SLOT_LENGTH_MINUTES * 60 * 1000);
  }

  // No available slot within the checked window
  return null;
}
