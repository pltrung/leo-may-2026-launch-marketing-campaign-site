import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";
import { getGymToday, getGymDateFromISO } from "@/lib/gymTimezone";

/**
 * GET /api/route-setter/zones
 * Returns all route zones with due/overdue/recent status.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const [{ data: zones, error }, { data: assignments }] = await Promise.all([
    supabase
      .from("route_zones")
      .select("id, name, reset_frequency_days, last_reset_at, next_reset_at")
      .order("next_reset_at", { ascending: true, nullsFirst: true }),
    supabase
      .from("route_reset_assignments")
      .select("zone_id, staff_id, assigned_at, staff_profiles(display_name, email)")
      .order("assigned_at", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  const nowMs = Date.now();
  const zonesWithStatus = (zones ?? []).map((z) => {
    const next = z.next_reset_at as string | null;
    const lastReset = z.last_reset_at as string | null;
    const routeAgeDays = lastReset
      ? Math.max(0, Math.floor((nowMs - new Date(lastReset).getTime()) / (24 * 60 * 60 * 1000)))
      : null;
    const assigned_setters = (assignments ?? [])
      .filter((a) => a.zone_id === z.id)
      .map((a) => {
        const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles;
        const name = (p?.display_name as string | null) || (p?.email as string | null);
        return name ? { staff_id: a.staff_id as string, name } : null;
      })
      .filter((x): x is { staff_id: string; name: string } => !!x);

    const completedToday = lastReset ? getGymDateFromISO(lastReset) === today : false;
    const dueToday = next ? getGymDateFromISO(next) === today : false;
    const isOverdue = next ? next < now : false;
    let reset_status: "not_started" | "pending" | "in_progress" | "completed" | "overdue" = "not_started";
    if (completedToday) reset_status = "completed";
    else if (isOverdue) reset_status = "overdue";
    else if (dueToday) reset_status = assigned_setters.length > 0 ? "in_progress" : "pending";

    return { ...z, route_age_days: routeAgeDays, reset_status, assigned_setters };
  });

  const overdue = zonesWithStatus.filter((z) => z.reset_status === "overdue");
  const due = zonesWithStatus.filter((z) => z.reset_status === "overdue");
  const recent = zonesWithStatus.filter((z) => z.reset_status === "completed");

  return NextResponse.json({
    zones: zonesWithStatus,
    overdue,
    due,
    recent,
  });
}
