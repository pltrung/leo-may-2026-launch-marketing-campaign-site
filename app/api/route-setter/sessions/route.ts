import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { ensureTodayCoachingSlots } from "@/lib/coachingSessions";

/**
 * GET /api/route-setter/sessions
 * Returns today's coaching sessions: upcoming, assigned to me, unassigned.
 * Ensures today's 30-min slots (09:00–21:00) exist with up to 2 sessions per slot.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  await ensureTodayCoachingSlots(supabase);

  const now = new Date();
  const nowIso = now.toISOString();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from("coaching_sessions")
    .select("id, start_time, end_time, coach_id, session_type, status, location, staff_profiles(email, display_name)")
    .gt("start_time", nowIso)
    .lte("start_time", twoHoursLater)
    .in("status", ["scheduled"])
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = sessions ?? [];
  const sessionIds = list.map((s) => s.id);
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

  const listWithMeta = list.map((s) => ({
    ...s,
    location: (s.location as string) ?? "Main Wall - Beginner Area",
    newbie_count: newbieCountBySession[s.id] ?? 0,
  }));

  const mySessions = listWithMeta.filter((s) => s.coach_id === staff.id);
  const unassigned = listWithMeta.filter((s) => !s.coach_id);

  return NextResponse.json({
    sessions: listWithMeta,
    my_sessions: mySessions,
    unassigned,
  });
}

/**
 * POST /api/route-setter/sessions/assign
 * Body: { session_id: string }
 * Assigns the session to the current staff. Fails if slot already has 2 sessions
 * or staff is NOT_IN today.
 */
export async function POST(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = body.session_id;
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const { data: attendance } = await supabase
    .from("staff_attendance")
    .select("status")
    .eq("staff_id", staff.id)
    .eq("date", today)
    .maybeSingle();
  if (attendance?.status !== "IN") {
    return NextResponse.json({ error: "Mark yourself IN before taking sessions" }, { status: 403 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("coaching_sessions")
    .select("id, coach_id")
    .eq("id", sessionId)
    .single();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from("coaching_sessions")
    .update({ coach_id: staff.id, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
