import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { fetchGymOperationalSettings } from "@/lib/gymOperationalSettings";

/**
 * GET /api/admin/staff/my-attendance
 * Returns today's attendance for the current staff (for frontdesk shift check-in block).
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (unified.role === "checkin_operator") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ attendance: null });

  const today = getGymToday();
  const settings = await fetchGymOperationalSettings(supabase);
  const selfCheckinEnabledToday =
    settings.allow_self_checkin_today === true && settings.allow_self_checkin_date === today;
  const { data: record } = await supabase
    .from("staff_attendance")
    .select("id, date, status, created_at")
    .eq("staff_id", staffId)
    .eq("date", today)
    .maybeSingle();

  return NextResponse.json({
    attendance: record ?? null,
    self_checkin_enabled_today: selfCheckinEnabledToday,
  });
}

/**
 * POST /api/admin/staff/my-attendance
 * Body: { status: "IN" | "NOT_IN" }
 * Upserts today's attendance for the current staff (shift check-in). Used by Staff and Frontdesk with staffId.
 */
export async function POST(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (unified.role === "checkin_operator") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status === "NOT_IN" ? "NOT_IN" : "IN";

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = getGymToday();
  if (status === "IN" && unified.role !== "admin") {
    const settings = await fetchGymOperationalSettings(supabase);
    const selfCheckinEnabledToday =
      settings.allow_self_checkin_today === true && settings.allow_self_checkin_date === today;
    if (!selfCheckinEnabledToday) {
      return NextResponse.json(
        { error: "Self check-in is disabled today. Please use front-desk QR scan." },
        { status: 403 }
      );
    }
  }
  const { error } = await supabase
    .from("staff_attendance")
    .upsert(
      { staff_id: staffId, date: today, status },
      { onConflict: "staff_id,date" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "NOT_IN") {
    const startOfDay = getGymStartOfDay(today);
    const endOfDay = getGymEndOfDay(today);
    await supabase
      .from("coaching_sessions")
      .update({ coach_id: null, updated_at: new Date().toISOString() })
      .eq("coach_id", staffId)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay);
  }

  return NextResponse.json({ ok: true, status });
}
