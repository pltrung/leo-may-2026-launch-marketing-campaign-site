import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/route-setter/sessions/assign
 * Body: { session_id: string }
 * Assigns the session to the current staff. Staff must be IN today.
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
