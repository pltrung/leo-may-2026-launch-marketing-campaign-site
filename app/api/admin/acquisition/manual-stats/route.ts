/**
 * POST /api/admin/acquisition/manual-stats
 * Manual entry of ad campaign daily stats (before external API sync).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const statDate = typeof body.stat_date === "string" ? body.stat_date.trim() : "";
    const platform = typeof body.platform === "string" ? body.platform.trim() : "manual";
    const campaignName = typeof body.campaign_name === "string" ? body.campaign_name.trim() : "";
    const campaignId = typeof body.campaign_id === "string" ? body.campaign_id.trim() || null : null;
    const adsetName = typeof body.adset_name === "string" ? body.adset_name.trim() || null : null;
    const adName = typeof body.ad_name === "string" ? body.ad_name.trim() || null : null;
    const spend = Math.max(0, Number(body.spend) || 0);
    const impressions = Math.max(0, Math.floor(Number(body.impressions) || 0));
    const clicks = Math.max(0, Math.floor(Number(body.clicks) || 0));
    const leads = Math.max(0, Math.floor(Number(body.leads) || 0));

    if (!statDate || !/^\d{4}-\d{2}-\d{2}$/.test(statDate)) {
      return NextResponse.json({ error: "stat_date required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!platform) {
      return NextResponse.json({ error: "platform required" }, { status: 400 });
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
    const cpc = clicks > 0 ? spend / clicks : null;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("ad_campaign_daily_stats")
      .insert({
        stat_date: statDate,
        platform,
        campaign_id: campaignId,
        campaign_name: campaignName || platform,
        adset_name: adsetName,
        ad_name: adName,
        spend,
        impressions,
        clicks,
        leads,
        ctr,
        cpc,
        source_mode: "manual",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
