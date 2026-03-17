import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymMonthBoundaries, getGymStartOfDay } from "@/lib/gymTimezone";

/**
 * GET /api/admin/staff/my-attendance-stats
 * Returns for the current month (gym TZ): check-ins count and whether 100% on time.
 * "On time" = checked in before 9:00 AM (gym TZ) so pre-open phase can be finished.
 * For staff and frontdesk with staffId only.
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) {
    return NextResponse.json({
      checkins_this_month: 0,
      on_time_count: 0,
      on_time_100: true,
    });
  }

  const { start: monthStart, end: monthEnd } = getGymMonthBoundaries();
  const { data: records } = await supabase
    .from("staff_attendance")
    .select("date, status, created_at")
    .eq("staff_id", staffId)
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .order("date", { ascending: true });

  const checkIns = (records ?? []).filter((r) => r.status === "IN");
  let onTimeCount = 0;
  for (const r of checkIns) {
    const nineAM = new Date(new Date(getGymStartOfDay(r.date)).getTime() + 9 * 60 * 60 * 1000).toISOString();
    if (r.created_at && r.created_at < nineAM) onTimeCount++;
  }
  const total = checkIns.length;
  const onTime100 = total === 0 || onTimeCount === total;

  return NextResponse.json({
    checkins_this_month: total,
    on_time_count: onTimeCount,
    on_time_100: onTime100,
  });
}
