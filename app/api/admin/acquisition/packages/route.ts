/**
 * GET /api/admin/acquisition/packages
 * Package conversion by campaign: which packages each campaign drives.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";
import type { TimeHorizon } from "@/lib/admin/analytics/periodUtils";
import { planToPackageGroup, PACKAGE_GROUPS } from "@/lib/acquisitionQueries";

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

  const [attrRes, paymentsRes] = await Promise.all([
    supabase
      .from("marketing_attribution")
      .select("user_id, first_touch_source, first_touch_campaign")
      .not("user_id", "is", null)
      .gte("first_touch_at", since)
      .lte("first_touch_at", until),
    supabase
      .from("payments")
      .select("member_id, plan_id, amount")
      .eq("status", "success")
      .gte("created_at", since)
      .lte("created_at", until),
  ]);

  const attrs = (attrRes.data ?? []) as { user_id: string; first_touch_source: string; first_touch_campaign: string }[];
  const payments = (paymentsRes.data ?? []) as { member_id: string; plan_id: string; amount: number }[];

  const memberToCampaign = new Map<string, string>();
  for (const a of attrs) {
    const key = `${a.first_touch_source || "direct"}::${a.first_touch_campaign || "(none)"}`;
    memberToCampaign.set(a.user_id, key);
  }

  const byCampaignPackage = new Map<string, Record<string, { count: number; revenue: number }>>();
  for (const p of payments) {
    const campKey = memberToCampaign.get(p.member_id) ?? "direct::(none)";
    const pkg = planToPackageGroup(p.plan_id);
    let row = byCampaignPackage.get(campKey);
    if (!row) {
      row = {};
      byCampaignPackage.set(campKey, row);
    }
    if (!row[pkg]) row[pkg] = { count: 0, revenue: 0 };
    row[pkg].count += 1;
    row[pkg].revenue += p.amount;
  }

  const packageKeys = Object.keys(PACKAGE_GROUPS) as (keyof typeof PACKAGE_GROUPS)[];
  const rows = Array.from(byCampaignPackage.entries()).map(([campKey, pkgCounts]) => {
    const [channel, campaignName] = campKey.split("::");
    const byPackage: Record<string, { count: number; revenue: number }> = {};
    for (const k of packageKeys) {
      byPackage[k] = pkgCounts[k] ?? { count: 0, revenue: 0 };
    }
    return { channel, campaign_name: campaignName, by_package: byPackage };
  });

  return NextResponse.json({
    packages: rows,
    package_labels: Object.fromEntries(
      (Object.entries(PACKAGE_GROUPS) as [string, { labelEn: string; labelVi: string }][]).map(([k, v]) => [
        k,
        v,
      ])
    ),
  });
}
