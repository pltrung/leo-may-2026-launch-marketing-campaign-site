import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";

/**
 * GET /api/route-setter/attendance
 * Returns today's attendance record for the current staff (if any).
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

  const today = getGymToday();
  const { data: record } = await supabase
    .from("staff_attendance")
    .select("id, date, status, created_at")
    .eq("staff_id", staff.id)
    .eq("date", today)
    .maybeSingle();

  return NextResponse.json({ attendance: record ?? null });
}

/**
 * POST /api/route-setter/attendance
 * Body: { status: "IN" | "NOT_IN" }
 * Upserts today's attendance for the current staff.
 */
export async function POST(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status === "NOT_IN" ? "NOT_IN" : "IN";

  const supabase = createServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = getGymToday();
  const { error } = await supabase
    .from("staff_attendance")
    .upsert(
      { staff_id: staff.id, date: today, status },
      { onConflict: "staff_id,date" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "NOT_IN") {
    const startOfDay = getGymStartOfDay(today);
    const endOfDay = getGymEndOfDay(today);
    await supabase
      .from("coaching_sessions")
      .update({ coach_id: null, updated_at: new Date().toISOString() })
      .eq("coach_id", staff.id)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay);
  }

  return NextResponse.json({ ok: true, status });
}
