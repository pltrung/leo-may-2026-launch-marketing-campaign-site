/**
 * GET /api/admin/alerts-count
 * Returns count of open analytics alerts (payroll, expiring, tasks, etc.) for the Operations bar.
 * Suppresses expiring/inactive alerts when those segments were emailed in the last 7 days.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { buildAnalyticsAlerts } from "@/lib/admin/analytics/alerts";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const base = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
    const cookie = req.headers.get("cookie") ?? "";
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;

    const supabase = createServerClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentCampaigns } = await supabase
      .from("campaign_logs")
      .select("segment")
      .gte("sent_at", sevenDaysAgo)
      .in("segment", ["expiring_soon_7d", "inactive_members_30d"]);
    const recentSegments = new Set((recentCampaigns ?? []).map((r: { segment: string }) => r.segment));
    const campaignSuppress = {
      expiring_7d: recentSegments.has("expiring_soon_7d"),
      inactive_30: recentSegments.has("inactive_members_30d"),
    };

    const [finRes, anRes] = await Promise.all([
      fetch(`${base}/api/admin/finance?horizon=mtd`, { headers }),
      fetch(`${base}/api/admin/analytics?horizon=mtd`, { headers }),
    ]);

    const finance = finRes.ok ? await finRes.json() : null;
    const analytics = anRes.ok ? await anRes.json() : null;

    const financePayload = finance
      ? {
          payroll_total: finance.payroll_total ?? 0,
          config: finance.config,
          payroll_record: finance.payroll_record,
        }
      : null;

    const analyticsSlice = analytics
      ? {
          operations: analytics.operations,
          members: analytics.members ? { member_health: analytics.members.member_health } : undefined,
        }
      : null;

    const alerts = buildAnalyticsAlerts(financePayload, analyticsSlice, "en", campaignSuppress);
    return NextResponse.json({ count: alerts.length });
  } catch (e) {
    console.error("alerts-count", e);
    return NextResponse.json({ count: 0 });
  }
}
