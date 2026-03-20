/**
 * GET /api/admin/alerts-count
 * Returns count of open analytics alerts (payroll, expiring, tasks, etc.) for the Operations bar.
 * Suppresses expiring/inactive alerts when those segments were emailed in the last 7 days.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { buildAnalyticsAlerts } from "@/lib/admin/analytics/alerts";
import { getGymToday } from "@/lib/gymTimezone";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const { since, until } = getPeriodRange("mtd");
    const today = getGymToday();
    const nowIso = new Date().toISOString();
    const in7Iso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesRes,
      recentCheckinsRes,
      tasksRes,
      zonesRes,
      coachingRes,
    ] = await Promise.all([
      supabase.from("member_profiles").select("id, membership_expires_at"),
      supabase.from("gym_checkins").select("member_id, timestamp").eq("counts_as_visit", true).gte("timestamp", ninetyDaysAgo),
      supabase.from("staff_tasks").select("status, due_date").gte("due_date", since.slice(0, 10)).lte("due_date", until.slice(0, 10)),
      supabase.from("route_zones").select("next_reset_at"),
      supabase.from("coaching_sessions").select("status, coach_id, start_time").gte("start_time", since).lte("start_time", until),
    ]);

    const profiles = (profilesRes.data ?? []) as { id: string; membership_expires_at?: string | null }[];
    const recentCheckins = (recentCheckinsRes.data ?? []) as { member_id: string; timestamp: string }[];
    const tasks = (tasksRes.data ?? []) as { status: string; due_date: string }[];
    const zones = (zonesRes.data ?? []) as { next_reset_at?: string | null }[];
    const coaching = (coachingRes.data ?? []) as { status: string; coach_id?: string | null }[];

    const lastVisitByMember = new Map<string, string>();
    for (const c of recentCheckins) {
      const prev = lastVisitByMember.get(c.member_id);
      if (!prev || c.timestamp > prev) lastVisitByMember.set(c.member_id, c.timestamp);
    }

    let atRisk = 0;
    let inactive = 0;
    let expiringSoon = 0;
    for (const p of profiles) {
      const lastTs = lastVisitByMember.get(p.id);
      const lastVisitDaysAgo = lastTs ? (Date.now() - new Date(lastTs).getTime()) / 86400000 : 999;
      if (lastVisitDaysAgo > 7 && lastVisitDaysAgo <= 14) atRisk++;
      if (lastVisitDaysAgo > 30) inactive++;
      if (p.membership_expires_at && p.membership_expires_at >= nowIso && p.membership_expires_at <= in7Iso) expiringSoon++;
    }

    const tasksOverdue = tasks.filter((t) => t.status !== "completed" && t.due_date < today).length;
    const routeResetsOverdue = zones.filter((z) => z.next_reset_at && z.next_reset_at < nowIso).length;
    const coachingMissed = coaching.filter((s) => s.status !== "cancelled" && !s.coach_id).length;

    const alerts = buildAnalyticsAlerts(
      null,
      {
        members: { member_health: { at_risk: atRisk, inactive, expiring_soon: expiringSoon } },
        operations: {
          tasks_overdue: tasksOverdue,
          route_resets_overdue: routeResetsOverdue,
          coaching_missed: coachingMissed,
        },
      },
      "en",
      campaignSuppress
    );
    return NextResponse.json({ count: alerts.length });
  } catch (e) {
    console.error("alerts-count", e);
    return NextResponse.json({ count: 0 });
  }
}
