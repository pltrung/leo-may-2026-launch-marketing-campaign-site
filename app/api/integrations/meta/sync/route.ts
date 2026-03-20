/**
 * POST /api/integrations/meta/sync
 * Syncs ad campaign insights from Meta Marketing API into ad_campaign_daily_stats.
 * Requires META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { runMetaSync } from "@/lib/metaSync";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const daysParam = url.searchParams.get("days");
  const days = Math.min(Math.max(parseInt(daysParam || "30", 10) || 30, 1), 90);

  const result = await runMetaSync(days);

  if (!result.ok) {
    const status = result.error.includes("not configured") ? 501 : 502;
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status }
    );
  }

  return NextResponse.json(result);
}
