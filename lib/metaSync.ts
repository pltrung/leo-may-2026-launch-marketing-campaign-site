/**
 * Meta Marketing API sync: fetch campaign insights and write to ad_campaign_daily_stats.
 * Used by POST /api/integrations/meta/sync (admin) and GET /api/cron/meta-sync (cron).
 */
import { createServerClient } from "@/lib/supabaseServer";
import { getGymToday } from "@/lib/gymTimezone";

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

type MetaInsightRow = {
  campaign_id?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
};

type MetaCampaign = { id: string; name: string };

function parseLeadCount(actions: MetaInsightRow["actions"]): number {
  if (!Array.isArray(actions)) return 0;
  return actions
    .filter((a) => a && typeof a.action_type === "string" && /lead/i.test(a.action_type))
    .reduce((sum, a) => sum + parseInt(String(a.value || "0"), 10), 0);
}

export type MetaSyncResult =
  | { ok: true; synced: number; range: { since: string; until: string }; campaigns: number }
  | { ok: false; error: string; detail?: string };

export async function runMetaSync(days = 30): Promise<MetaSyncResult> {
  const token = process.env.META_ACCESS_TOKEN ?? process.env.META_APP_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!token || !adAccountId) {
    return {
      ok: false,
      error: "Meta API not configured. Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.",
    };
  }

  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const daysClamped = Math.min(Math.max(days, 1), 90);

  const until = new Date(getGymToday());
  const since = new Date(until);
  since.setDate(since.getDate() - daysClamped);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);

  try {
    const campaignsRes = await fetch(
      `${META_GRAPH_BASE}/${accountId}/campaigns?fields=id,name&access_token=${encodeURIComponent(token)}&limit=500`
    );
    if (!campaignsRes.ok) {
      const errText = await campaignsRes.text();
      return { ok: false, error: `Meta campaigns API error: ${campaignsRes.status}`, detail: errText.slice(0, 300) };
    }
    const campaignsData = (await campaignsRes.json()) as { data?: MetaCampaign[] };
    const campaignMap = new Map<string, string>();
    for (const c of campaignsData.data ?? []) {
      if (c?.id && c?.name) campaignMap.set(String(c.id), String(c.name));
    }

    const insightParams = new URLSearchParams({
      access_token: token,
      level: "campaign",
      time_increment: "1",
      fields: "campaign_id,spend,impressions,clicks,actions",
      time_range: JSON.stringify({ since: sinceStr, until: untilStr }),
      limit: "500",
    });
    const insightsRes = await fetch(
      `${META_GRAPH_BASE}/${accountId}/insights?${insightParams.toString()}`
    );
    if (!insightsRes.ok) {
      const errText = await insightsRes.text();
      return { ok: false, error: `Meta insights API error: ${insightsRes.status}`, detail: errText.slice(0, 300) };
    }
    const insightsData = (await insightsRes.json()) as { data?: MetaInsightRow[] };
    const rows = insightsData.data ?? [];

    const supabase = createServerClient();

    const { error: delErr } = await supabase
      .from("ad_campaign_daily_stats")
      .delete()
      .eq("platform", "facebook")
      .eq("source_mode", "api")
      .gte("stat_date", sinceStr)
      .lte("stat_date", untilStr);

    if (delErr) {
      return { ok: false, error: "Failed to clear existing sync data", detail: String(delErr) };
    }

    let inserted = 0;
    for (const r of rows) {
      const cid = r.campaign_id ? String(r.campaign_id) : null;
      const statDate = r.date_start ?? r.date_stop;
      if (!statDate || !/^\d{4}-\d{2}-\d{2}$/.test(statDate)) continue;

      const spend = parseFloat(String(r.spend || "0")) || 0;
      const impressions = parseInt(String(r.impressions || "0"), 10) || 0;
      const clicks = parseInt(String(r.clicks || "0"), 10) || 0;
      const leads = parseLeadCount(r.actions);
      const campaignName = (cid && campaignMap.get(cid)) || cid || "Unknown";

      const { error: insErr } = await supabase.from("ad_campaign_daily_stats").insert({
        stat_date: statDate,
        platform: "facebook",
        campaign_id: cid,
        campaign_name: campaignName,
        spend,
        impressions,
        clicks,
        leads,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : null,
        source_mode: "api",
      });

      if (!insErr) inserted++;
    }

    return {
      ok: true,
      synced: inserted,
      range: { since: sinceStr, until: untilStr },
      campaigns: campaignMap.size,
    };
  } catch (e) {
    return {
      ok: false,
      error: "Sync failed",
      detail: String((e as Error).message),
    };
  }
}
