/**
 * GET /api/admin/acquisition/overview
 * KPI summary for Acquisition tab: spend, impressions, clicks, leads, signups, purchases, first check-ins, CAC, ROAS.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";
import type { TimeHorizon } from "@/lib/admin/analytics/periodUtils";

function parseDateRange(
  from: string | null,
  to: string | null,
  horizon: string | null
): { since: string; until: string } {
  const today = getGymToday();
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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const horizon = url.searchParams.get("horizon");
  const { since, until } = parseDateRange(from, to, horizon);

  const supabase = createServerClient();

  const [statsRes, attrRes, membersRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from("ad_campaign_daily_stats")
      .select("spend, impressions, clicks, leads")
      .gte("stat_date", since.slice(0, 10))
      .lte("stat_date", until.slice(0, 10)),
    supabase
      .from("marketing_attribution")
      .select("user_id")
      .not("user_id", "is", null)
      .gte("first_touch_at", since)
      .lte("first_touch_at", until),
    supabase
      .from("member_profiles")
      .select("id")
      .gte("created_at", since)
      .lte("created_at", until),
    supabase
      .from("payments")
      .select("member_id, amount")
      .eq("status", "success")
      .gte("created_at", since)
      .lte("created_at", until),
    supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .gte("timestamp", since)
      .lte("timestamp", until),
  ]);

  const stats = (statsRes.data ?? []) as { spend: number; impressions: number; clicks: number; leads: number }[];
  const totalSpend = stats.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const totalImpressions = stats.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalClicks = stats.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalLeads = stats.reduce((s, r) => s + (r.leads ?? 0), 0);

  const attributedUserIds = new Set(
    (attrRes.data ?? []).map((r: { user_id: string | null }) => r.user_id).filter(Boolean)
  );
  const signups = (membersRes.data ?? []).length;
  const payments = (paymentsRes.data ?? []) as { member_id: string; amount: number }[];
  const totalRevenue = payments.reduce((s, r) => s + (r.amount ?? 0), 0);

  const checkins = (checkinsRes.data ?? []) as { member_id: string; timestamp: string }[];
  const firstCheckinByMember = new Map<string, string>();
  for (const c of checkins) {
    if (!firstCheckinByMember.has(c.member_id)) firstCheckinByMember.set(c.member_id, c.timestamp);
  }
  const firstCheckins = firstCheckinByMember.size;

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cac = firstCheckins > 0 ? totalSpend / firstCheckins : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return NextResponse.json({
    since,
    until,
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: Math.round(ctr * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    leads: totalLeads,
    signups,
    purchases: payments.length,
    first_checkins: firstCheckins,
    revenue: totalRevenue,
    cac: Math.round(cac * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    attributed_count: attributedUserIds.size,
  });
}
