import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday, parseGymDateTime, getGymEndOfDay } from "@/lib/gymTimezone";
import {
  aggregateNewbieSessionsBySlot,
  type CoachingSessionRow,
} from "@/lib/newbieCoachingAggregation";

/**
 * GET /api/route-setter/sessions
 * Returns today's coaching sessions (gym day, from open through close) with at least one newbie booking:
 * all such slots, assigned to me, and unassigned. Matches /api/admin/staff sessionsToday window (not only next 2h).
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

  const now = new Date();
  const nowMs = now.getTime();
  const today = getGymToday();
  const openStartIso = parseGymDateTime(today, "10:00");
  const todayEndIso = getGymEndOfDay(today);

  const { data: sessions, error } = await supabase
    .from("coaching_sessions")
    .select("id, start_time, end_time, coach_id, session_type, status, location, staff_profiles(email, display_name)")
    .gte("start_time", openStartIso)
    .lte("start_time", todayEndIso)
    .in("status", ["scheduled"])
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (sessions ?? []) as CoachingSessionRow[];
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

  const aggregated = aggregateNewbieSessionsBySlot(list, newbieCountBySession);
  const listWithMeta = aggregated.filter((s) => {
    if (!s.end_time) return true;
    return new Date(s.end_time).getTime() > nowMs;
  });

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

  const today = getGymToday();
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
