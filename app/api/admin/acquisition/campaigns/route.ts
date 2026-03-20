/**
 * GET /api/admin/acquisition/campaigns
 * Campaign funnel: spend, impressions, clicks, leads, signups, purchases, first check-ins by campaign.
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
  const { since, until } = parseDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    url.searchParams.get("horizon")
  );

  const supabase = createServerClient();

  const [statsRes, attrRes, membersRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from("ad_campaign_daily_stats")
      .select("platform, campaign_name, spend, impressions, clicks, leads")
      .gte("stat_date", since.slice(0, 10))
      .lte("stat_date", until.slice(0, 10)),
    supabase
      .from("marketing_attribution")
      .select("user_id, first_touch_source, first_touch_campaign")
      .not("user_id", "is", null)
      .gte("first_touch_at", since)
      .lte("first_touch_at", until),
    supabase.from("member_profiles").select("id, created_at").gte("created_at", since).lte("created_at", until),
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

  const stats = (statsRes.data ?? []) as {
    platform: string;
    campaign_name: string;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
  }[];

  const byCampaign = new Map<
    string,
    { platform: string; campaign_name: string; spend: number; impressions: number; clicks: number; leads: number }
  >();
  for (const s of stats) {
    const key = `${s.platform}::${s.campaign_name || "(none)"}`;
    const cur = byCampaign.get(key);
    if (cur) {
      cur.spend += Number(s.spend ?? 0);
      cur.impressions += s.impressions ?? 0;
      cur.clicks += s.clicks ?? 0;
      cur.leads += (s.leads ?? 0);
    } else {
      byCampaign.set(key, {
        platform: s.platform,
        campaign_name: s.campaign_name || "(none)",
        spend: Number(s.spend ?? 0),
        impressions: s.impressions ?? 0,
        clicks: s.clicks ?? 0,
        leads: s.leads ?? 0,
      });
    }
  }

  const attrs = (attrRes.data ?? []) as { user_id: string; first_touch_source: string; first_touch_campaign: string }[];
  const members = (membersRes.data ?? []) as { id: string; created_at: string }[];
  const payments = (paymentsRes.data ?? []) as { member_id: string; amount: number }[];
  const checkins = (checkinsRes.data ?? []) as { member_id: string; timestamp: string }[];

  const firstCheckinByMember = new Map<string, string>();
  for (const c of checkins) {
    if (!firstCheckinByMember.has(c.member_id)) firstCheckinByMember.set(c.member_id, c.timestamp);
  }

  const memberCreatedAt = new Map(members.map((m) => [m.id, m.created_at]));
  const memberToPayment = new Map<string, number>();
  for (const p of payments) {
    memberToPayment.set(p.member_id, (memberToPayment.get(p.member_id) ?? 0) + p.amount);
  }

  const memberToCampaign = new Map<string, string>();
  for (const a of attrs) {
    const key = `${a.first_touch_source || "direct"}::${a.first_touch_campaign || "(none)"}`;
    memberToCampaign.set(a.user_id, key);
  }

  for (const [key, row] of Array.from(byCampaign.entries())) {
    const [platform, campaignName] = key.split("::");
    let signups = 0;
    let purchases = 0;
    let firstCheckins = 0;
    let revenue = 0;
    for (const [uid, campKey] of Array.from(memberToCampaign.entries())) {
      if (campKey !== key) continue;
      if (memberCreatedAt.has(uid)) signups++;
      const amt = memberToPayment.get(uid);
      if (amt != null && amt > 0) {
        purchases++;
        revenue += amt;
      }
      if (firstCheckinByMember.has(uid)) firstCheckins++;
    }
    (row as Record<string, unknown>).signups = signups;
    (row as Record<string, unknown>).purchases = purchases;
    (row as Record<string, unknown>).first_checkins = firstCheckins;
    (row as Record<string, unknown>).revenue = revenue;
    const leadToSignup = row.leads > 0 ? (signups / row.leads) * 100 : 0;
    const signupToPurchase = signups > 0 ? (purchases / signups) * 100 : 0;
    const purchaseToCheckin = purchases > 0 ? (firstCheckins / purchases) * 100 : 0;
    (row as Record<string, unknown>).lead_to_signup_pct = Math.round(leadToSignup * 100) / 100;
    (row as Record<string, unknown>).signup_to_purchase_pct = Math.round(signupToPurchase * 100) / 100;
    (row as Record<string, unknown>).purchase_to_checkin_pct = Math.round(purchaseToCheckin * 100) / 100;
    (row as Record<string, unknown>).cac = firstCheckins > 0 ? Math.round((row.spend / firstCheckins) * 100) / 100 : 0;
    (row as Record<string, unknown>).roas = row.spend > 0 ? Math.round((revenue / row.spend) * 100) / 100 : 0;
  }

  const rows = Array.from(byCampaign.values()).map((r) => ({
    channel: r.platform,
    campaign_name: r.campaign_name,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0,
    leads: r.leads,
    signups: (r as Record<string, unknown>).signups,
    purchases: (r as Record<string, unknown>).purchases,
    first_checkins: (r as Record<string, unknown>).first_checkins,
    lead_to_signup_pct: (r as Record<string, unknown>).lead_to_signup_pct,
    signup_to_purchase_pct: (r as Record<string, unknown>).signup_to_purchase_pct,
    purchase_to_checkin_pct: (r as Record<string, unknown>).purchase_to_checkin_pct,
    cac: (r as Record<string, unknown>).cac,
    revenue: (r as Record<string, unknown>).revenue,
    roas: (r as Record<string, unknown>).roas,
  }));

  return NextResponse.json({ campaigns: rows });
}
