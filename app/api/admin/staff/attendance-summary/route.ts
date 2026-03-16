import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymMonthBoundaries, getGymWeekBoundaries } from "@/lib/gymTimezone";

/**
 * GET /api/admin/staff/attendance-summary?period=month&year=2026&month=3
 * or ?period=week&year=2026&week=11
 * Returns per-staff IN attendance count for the given month or week. Admin only.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month";
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);
  const week = parseInt(searchParams.get("week") ?? "", 10);

  let startDate: string;
  let endDate: string;
  let label: string;

  if (period === "week") {
    const bounds = getGymWeekBoundaries(year, week);
    startDate = bounds.start;
    endDate = bounds.end;
    label = !isNaN(year) && !isNaN(week) ? `Week ${week}, ${year}` : "This week (gym TZ)";
  } else {
    const bounds = getGymMonthBoundaries(isNaN(year) ? undefined : year, isNaN(month) ? undefined : month);
    startDate = bounds.start;
    endDate = bounds.end;
    const [y, m] = startDate.split("-").map(Number);
    label = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  const supabase = createServerClient();
  const { data: rows, error } = await supabase
    .from("staff_attendance")
    .select("staff_id")
    .eq("status", "IN")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countByStaff: Record<string, number> = {};
  for (const r of rows ?? []) {
    const id = r.staff_id as string;
    countByStaff[id] = (countByStaff[id] ?? 0) + 1;
  }

  const staffIds = Object.keys(countByStaff);
  if (staffIds.length === 0) {
    return NextResponse.json({
      period,
      label,
      start_date: startDate,
      end_date: endDate,
      staff: [],
    });
  }

  const { data: profiles } = await supabase
    .from("staff_profiles")
    .select("id, email, display_name")
    .in("id", staffIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const staff = staffIds.map((id) => {
    const p = profileMap.get(id);
    return {
      staff_id: id,
      display_name: p?.display_name ?? null,
      email: p?.email ?? null,
      in_days: countByStaff[id] ?? 0,
    };
  }).sort((a, b) => (b.in_days - a.in_days));

  return NextResponse.json({
    period,
    label,
    start_date: startDate,
    end_date: endDate,
    staff,
  });
}
