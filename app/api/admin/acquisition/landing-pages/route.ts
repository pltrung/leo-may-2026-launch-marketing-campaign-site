/**
 * GET /api/admin/acquisition/landing-pages
 * Landing page performance: sessions, leads, signups, purchases, first check-ins by landing_path.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";
import type { TimeHorizon } from "@/lib/admin/analytics/periodUtils";

function parseDateRange(from: string | null, to: string | null, horizon: string | null) {
  if (horizon && ["wtd", "mtd", "qtd", "ytd"].includes(horizon)) {
    const r = getPeriodRange(horizon as TimeHorizon);
    return { since: r.since, until: r.until };
  }
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { since: getGymStartOfDay(from), until: getGymEndOfDay(to) };
  }
  const r = getPeriodRange("mtd");
  return { since: r.since, until: r.until };
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { since, until } = parseDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    url.searchParams.get("horizon")
  );

  const supabase = createServerClient();

  const [attrRes, membersRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from("marketing_attribution")
      .select("user_id, landing_path")
      .gte("first_touch_at", since)
      .lte("first_touch_at", until),
    supabase.from("member_profiles").select("id").gte("created_at", since).lte("created_at", until),
    supabase
      .from("payments")
      .select("member_id")
      .eq("status", "success")
      .gte("created_at", since)
      .lte("created_at", until),
    supabase
      .from("gym_checkins")
      .select("member_id")
      .gte("timestamp", since)
      .lte("timestamp", until),
  ]);

  const attrs = (attrRes.data ?? []) as { user_id: string | null; landing_path: string | null }[];
  const members = new Set((membersRes.data ?? []).map((r: { id: string }) => r.id));
  const purchasers = new Set((paymentsRes.data ?? []).map((r: { member_id: string }) => r.member_id));
  const checkinMembers = new Set<string>();
  for (const c of (checkinsRes.data ?? []) as { member_id: string }[]) {
    checkinMembers.add(c.member_id);
  }

  const byPath = new Map<
    string,
    { sessions: number; leads: number; signups: number; purchases: number; first_checkins: number }
  >();

  for (const a of attrs) {
    const path = a.landing_path || "/";
    let row = byPath.get(path);
    if (!row) {
      row = { sessions: 0, leads: 0, signups: 0, purchases: 0, first_checkins: 0 };
      byPath.set(path, row);
    }
    row.sessions += 1;
    if (a.user_id) {
      row.leads += 1;
      if (members.has(a.user_id)) row.signups += 1;
      if (purchasers.has(a.user_id)) row.purchases += 1;
      if (checkinMembers.has(a.user_id)) row.first_checkins += 1;
    }
  }

  const rows = Array.from(byPath.entries())
    .map(([landing_path, r]) => ({
      landing_path,
      sessions: r.sessions,
      leads: r.leads,
      signups: r.signups,
      purchases: r.purchases,
      first_checkins: r.first_checkins,
      lead_rate: r.sessions > 0 ? Math.round((r.leads / r.sessions) * 10000) / 100 : 0,
      signup_rate: r.leads > 0 ? Math.round((r.signups / r.leads) * 10000) / 100 : 0,
      purchase_rate: r.signups > 0 ? Math.round((r.purchases / r.signups) * 10000) / 100 : 0,
      checkin_rate: r.purchases > 0 ? Math.round((r.first_checkins / r.purchases) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json({ landing_pages: rows });
}
