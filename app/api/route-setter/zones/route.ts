import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * GET /api/route-setter/zones
 * Returns all route zones with due/overdue/recent status.
 */
export async function GET(request: NextRequest) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: zones, error } = await supabase
    .from("route_zones")
    .select("id, name, reset_frequency_days, last_reset_at, next_reset_at")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  const nowMs = Date.now();
  const zonesWithStatus = (zones ?? []).map((z) => {
    const next = z.next_reset_at as string | null;
    const lastReset = z.last_reset_at as string | null;
    const daysSinceReset = lastReset
      ? (nowMs - new Date(lastReset).getTime()) / (24 * 60 * 60 * 1000)
      : null;
    let status: "overdue" | "due" | "recent" | "upcoming" = "upcoming";
    if (daysSinceReset !== null && daysSinceReset <= 1) status = "recent";
    else if (next) {
      if (next < now) status = "overdue";
      else {
        const daysUntil = (new Date(next).getTime() - nowMs) / (24 * 60 * 60 * 1000);
        if (daysUntil <= 2) status = "due";
      }
    }
    return { ...z, status };
  });

  const overdue = zonesWithStatus.filter((z) => z.status === "overdue");
  const due = zonesWithStatus.filter((z) => z.status === "due");
  const recent = zonesWithStatus.filter((z) => z.status === "recent");

  return NextResponse.json({
    zones: zonesWithStatus,
    overdue,
    due,
    recent,
  });
}
