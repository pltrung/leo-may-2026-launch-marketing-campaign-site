/**
 * GET /api/admin/analytics
 * Admin-only. Returns aggregated analytics for the dashboard.
 * Query: horizon=wtd|mtd|qtd|ytd (CEO time horizon, preferred),
 *        period=day|week|month|quarter, from=YYYY-MM-DD, to=YYYY-MM-DD (optional custom),
 *        member_type=all|member|newbie|casual, activity=all|active|inactive
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import {
  getGymToday,
  getGymStartOfDay,
  getGymStartOfWeek,
  getGymStartOfMonth,
  getGymStartOfQuarter,
  getGymEndOfDay,
  getGymDateFromISO,
} from "@/lib/gymTimezone";
import { getPeriodRange, type TimeHorizon } from "@/lib/admin/analytics/periodUtils";

function parseDateRange(
  period: string,
  fromParam: string | null,
  toParam: string | null
): { since: string; until: string; label: string } {
  const today = getGymToday();
  const until = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? getGymEndOfDay(toParam) : getGymEndOfDay(today);
  if (fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
    return { since: getGymStartOfDay(fromParam), until, label: "custom" };
  }
  if (period === "week") {
    const since = getGymStartOfWeek();
    return { since, until: getGymEndOfDay(today), label: "week" };
  }
  if (period === "month") {
    const since = getGymStartOfMonth();
    return { since, until: getGymEndOfDay(today), label: "month" };
  }
  if (period === "quarter") {
    const since = getGymStartOfQuarter();
    return { since, until: getGymEndOfDay(today), label: "quarter" };
  }
  const since = getGymStartOfDay(today);
  return { since, until: getGymEndOfDay(today), label: "day" };
}

/** Map plan_id to revenue category */
function planToCategory(planId: string): string {
  if (planId === "newbie_class") return "newbie";
  if (planId === "day_pass") return "day_pass";
  if (planId?.startsWith("visit_")) return "visit_pass";
  if (
    ["month_pass", "year_pass", "explorer_month", "explorer_year", "until_end_of_year"].includes(planId)
  )
    return "membership";
  return "other";
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const horizonParam = url.searchParams.get("horizon") as TimeHorizon | null;
  const period = url.searchParams.get("period") ?? "month";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const memberType = url.searchParams.get("member_type") ?? "all";
  const activity = url.searchParams.get("activity") ?? "all";
  const activityLevel = url.searchParams.get("activity_level") ?? "all";

  let since: string;
  let until: string;
  let label: string;
  let periodHorizon: TimeHorizon | null = null;

  if (period === "custom" && fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
    const parsed = parseDateRange(period, fromParam, toParam);
    since = parsed.since;
    until = parsed.until;
    label = parsed.label;
  } else if (horizonParam && ["wtd", "mtd", "qtd", "ytd"].includes(horizonParam)) {
    const range = getPeriodRange(horizonParam);
    since = range.since;
    until = range.until;
    label = range.label;
    periodHorizon = horizonParam;
  } else {
    const parsed = parseDateRange(period, fromParam, toParam);
    since = parsed.since;
    until = parsed.until;
    label = parsed.label;
    if (period === "week") periodHorizon = "wtd";
    else if (period === "month") periodHorizon = "mtd";
    else if (period === "quarter") periodHorizon = "qtd";
    else if (period === "day") periodHorizon = null;
  }
  const supabase = createServerClient();

  try {
    // Optional: resolve member IDs by segment (member_type + activity). For simplicity we run all queries in range; filters can be applied in a second pass or via subqueries.
    let memberIdsFilter: string[] | null = null;
    if (memberType !== "all" || activity !== "all") {
      const { data: allMembers } = await supabase.from("member_profiles").select("id").limit(5000);
      const ids = (allMembers ?? []).map((r: { id: string }) => r.id);
      if (ids.length === 0) {
        return NextResponse.json({
          filters: { period: label, since, until, period_horizon: periodHorizon, period_since: since, period_until: until, member_type: memberType, activity, activity_level: activityLevel },
          fetched_at: new Date().toISOString(),
          retention_cohort: {
            d1: { pct: 0, numerator: 0, denominator: 0 },
            d7: { pct: 0, numerator: 0, denominator: 0 },
            d30: { pct: 0, numerator: 0, denominator: 0 },
          },
          ceo_snapshot: {
            checkins_today: 0,
            newbie_class_sessions_today: 0,
            current_paying_members: 0,
            renewals_mtd: 0,
            new_members_mtd: 0,
            expiring_7d_all: 0,
            expiring_30d_all: 0,
          },
          overview: { total_revenue: 0, total_members: 0, active_members: 0, total_visits: 0 },
          revenue: { total: 0, by_category: {}, over_time: [], arpu: 0, revenue_per_visit: 0 },
          members: {
            total: 0,
            active: 0,
            inactive: 0,
            new_over_time: [],
            churn_rate: 0,
            avg_visits_per_member: 0,
            membership_distribution: { by_plan: { "30_day": { count: 0, pct: 0, active_count: 0 }, "180_day": { count: 0, pct: 0, active_count: 0 }, "365_day": { count: 0, pct: 0, active_count: 0 }, visit_pass: { count: 0, pct: 0, active_count: 0 }, day_pass: { count: 0, pct: 0, active_count: 0 } }, trend: [] },
            member_health: { active: 0, at_risk: 0, inactive: 0, expiring_soon: 0, expiring_30_days: 0, by_plan: {} },
            newbie_conversion_funnel: { purchased_count: 0, return_7_days_pct: 0, return_30_days_pct: 0, converted_to_membership_pct: 0 },
            activity_segmentation: { highly_active: 0, moderate: 0, low_activity: 0, inactive: 0 },
            action_insights: [],
          },
          retention: { day1: 0, day7: 0, day30: 0, newbie_purchased_pct: 0, newbie_return_7_pct: 0, newbie_return_30_pct: 0 },
          behavior: { dau: [], wau: 0, mau: 0, visits_per_user: [], peak_hours: [] },
          funnel: { first_visit_to_purchase: 0, newbie_to_return: 0, return_to_membership: 0 },
          operations: { tasks_completed: 0, tasks_overdue: 0, completion_rate: 0, route_resets_overdue: 0, coaching_completed: 0, coaching_missed: 0 },
          staff: [],
        });
      }
      if (memberType !== "all") {
        const { data: paymentsByMember } = await supabase
          .from("payments")
          .select("member_id, plan_id")
          .eq("status", "success");
        const byMember = new Map<string, Set<string>>();
        for (const p of paymentsByMember ?? []) {
          const mid = (p as { member_id: string; plan_id: string }).member_id;
          if (!byMember.has(mid)) byMember.set(mid, new Set());
          byMember.get(mid)!.add((p as { plan_id: string }).plan_id);
        }
        const newbieIds = new Set<string>();
        const memberIds = new Set<string>();
        const casualIds = new Set<string>();
        for (const id of ids) {
          const plans = byMember.get(id);
          if (plans?.has("newbie_class")) newbieIds.add(id);
          if (
            plans?.has("month_pass") ||
            plans?.has("half_year_pass") ||
            plans?.has("year_pass") ||
            plans?.has("explorer_month") ||
            plans?.has("explorer_year")
          )
            memberIds.add(id);
          if (
            !memberIds.has(id) &&
            (plans?.has("day_pass") || Array.from(plans ?? []).some((pid) => pid.startsWith("visit_")))
          )
            casualIds.add(id);
        }
        if (memberType === "newbie") memberIdsFilter = Array.from(newbieIds);
        else if (memberType === "member") memberIdsFilter = Array.from(memberIds);
        else if (memberType === "casual") memberIdsFilter = Array.from(casualIds);
      }
      if (activity !== "all" && memberIdsFilter !== null) {
        const { data: checkins } = await supabase
          .from("gym_checkins")
          .select("member_id")
          .eq("counts_as_visit", true)
          .gte("timestamp", since)
          .lte("timestamp", until);
        const activeSet = new Set((checkins ?? []).map((c: { member_id: string }) => c.member_id));
        const base = memberIdsFilter.length ? memberIdsFilter : ids;
        if (activity === "active") memberIdsFilter = base.filter((id) => activeSet.has(id));
        else if (activity === "inactive") memberIdsFilter = base.filter((id) => !activeSet.has(id));
      } else if (activity !== "all" && memberIdsFilter === null) {
        const { data: checkins } = await supabase
          .from("gym_checkins")
          .select("member_id")
          .eq("counts_as_visit", true)
          .gte("timestamp", since)
          .lte("timestamp", until);
        const activeSet = new Set((checkins ?? []).map((c: { member_id: string }) => c.member_id));
        if (activity === "active") memberIdsFilter = Array.from(activeSet);
        else if (activity === "inactive") {
          const { data: allM } = await supabase.from("member_profiles").select("id");
          const allIds = new Set((allM ?? []).map((r: { id: string }) => r.id));
          memberIdsFilter = Array.from(allIds).filter((id) => !activeSet.has(id));
        }
      }
    }

    let memberFilter = memberIdsFilter && memberIdsFilter.length > 0 ? memberIdsFilter : null;

    // ---- REVENUE ----
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("id, member_id, plan_id, amount, created_at")
      .gte("created_at", since)
      .lte("created_at", until)
      .eq("status", "success");
    const { data: posRows } = await supabase
      .from("pos_transactions")
      .select("id, member_id, staff_id, total, commission_amount, created_at")
      .gte("created_at", since)
      .lte("created_at", until)
      .eq("payment_status", "success");

    let payments = (paymentRows ?? []).filter(
      (p: { member_id: string }) => !memberFilter || memberFilter.includes(p.member_id)
    );
    let pos = (posRows ?? []).filter(
      (p: { member_id: string }) => !memberFilter || memberFilter.includes(p.member_id)
    );

    const revenueByCategory: Record<string, number> = {
      membership: 0,
      day_pass: 0,
      newbie: 0,
      visit_pass: 0,
      merch: 0,
      rental: 0,
      other: 0,
    };
    const revenueOverTime: { date: string; total: number }[] = [];
    let totalRevenue = 0;
    for (const p of payments as { plan_id: string; amount: number; created_at: string }[]) {
      totalRevenue += p.amount;
      const cat = planToCategory(p.plan_id);
      revenueByCategory[cat] = (revenueByCategory[cat] ?? 0) + p.amount;
    }
    for (const r of pos as { total: number; created_at: string }[]) {
      totalRevenue += r.total;
      revenueByCategory.merch = (revenueByCategory.merch ?? 0) + r.total; // POS = merch/retail for now
    }
    const paymentByDay = new Map<string, number>();
    for (const p of payments as { amount: number; created_at: string }[]) {
      const d = getGymDateFromISO(p.created_at);
      paymentByDay.set(d, (paymentByDay.get(d) ?? 0) + p.amount);
    }
    for (const r of pos as { total: number; created_at: string }[]) {
      const d = getGymDateFromISO(r.created_at);
      paymentByDay.set(d, (paymentByDay.get(d) ?? 0) + r.total);
    }
    const sortedDays = Array.from(paymentByDay.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    );
    for (const [date, total] of sortedDays) {
      revenueOverTime.push({ date, total });
    }

    // ---- MEMBERS & CHECK-INS ----
    const { data: memberRows } = await supabase
      .from("member_profiles")
      .select("id, created_at, membership_status, membership_expires_at");
    const allMembers = memberRows ?? [];
    const membersInRange = allMembers.filter((m: { id: string; created_at: string }) => {
      const created = (m as { created_at: string }).created_at;
      return created >= since && created <= until;
    });
    let filteredMembers =
      memberFilter === null ? allMembers : allMembers.filter((m: { id: string }) => memberFilter!.includes(m.id));
    const { data: checkinRows } = await supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .eq("counts_as_visit", true)
      .gte("timestamp", since)
      .lte("timestamp", until);
    let checkins = checkinRows ?? [];
    if (memberFilter) checkins = checkins.filter((c: { member_id: string }) => memberFilter!.includes(c.member_id));
    const periodDays = Math.max(1, (new Date(until).getTime() - new Date(since).getTime()) / (24 * 60 * 60 * 1000));
    const periodWeeks = periodDays / 7;
    const visitsPerMemberInPeriodForFilter = new Map<string, number>();
    for (const c of checkins as { member_id: string }[]) {
      const mid = c.member_id;
      visitsPerMemberInPeriodForFilter.set(mid, (visitsPerMemberInPeriodForFilter.get(mid) ?? 0) + 1);
    }
    type SegmentKey = "highly_active" | "moderate" | "low_activity" | "inactive";
    const segmentPerMember = new Map<string, SegmentKey>();
    if (periodWeeks > 0) {
      for (const m of filteredMembers as { id: string }[]) {
        const visits = visitsPerMemberInPeriodForFilter.get(m.id) ?? 0;
        const vpw = visits / periodWeeks;
        if (vpw >= 3) segmentPerMember.set(m.id, "highly_active");
        else if (vpw >= 1) segmentPerMember.set(m.id, "moderate");
        else if (vpw > 0) segmentPerMember.set(m.id, "low_activity");
        else segmentPerMember.set(m.id, "inactive");
      }
    }
    if (activityLevel !== "all" && (activityLevel === "highly_active" || activityLevel === "moderate" || activityLevel === "low_activity" || activityLevel === "inactive")) {
      filteredMembers = filteredMembers.filter((m: { id: string }) => segmentPerMember.get(m.id) === activityLevel);
      memberFilter = filteredMembers.map((m: { id: string }) => m.id);
      if (memberFilter.length > 0) checkins = checkins.filter((c: { member_id: string }) => memberFilter!.includes(c.member_id));
    }
    const uniqueVisitors = new Set(checkins.map((c: { member_id: string }) => c.member_id));
    const activeCount = uniqueVisitors.size;
    const totalMembers = filteredMembers.length;
    const inactiveCount = Math.max(0, totalMembers - activeCount);

    const newOverTime: { date: string; count: number }[] = [];
    const newByDay = new Map<string, number>();
    for (const m of filteredMembers as { created_at: string }[]) {
      const d = getGymDateFromISO(m.created_at);
      if (d >= since.slice(0, 10) && d <= until.slice(0, 10)) {
        newByDay.set(d, (newByDay.get(d) ?? 0) + 1);
      }
    }
    for (const [date, count] of Array.from(newByDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      newOverTime.push({ date, count });
    }

    const avgVisitsPerMember = totalMembers > 0 ? checkins.length / totalMembers : 0;
    const prevPeriodStart = new Date(new Date(since).getTime() - (new Date(until).getTime() - new Date(since).getTime())).toISOString();
    const { data: prevCheckins } = await supabase
      .from("gym_checkins")
      .select("member_id")
      .eq("counts_as_visit", true)
      .gte("timestamp", prevPeriodStart)
      .lt("timestamp", since);
    const prevActive = new Set((prevCheckins ?? []).map((c: { member_id: string }) => c.member_id));
    const churned = filteredMembers.filter(
      (m: { id: string }) => prevActive.has(m.id) && !uniqueVisitors.has(m.id)
    ).length;
    const churnRate = prevActive.size > 0 ? (churned / prevActive.size) * 100 : 0;

    // ---- MEMBERS: distribution, health, newbie funnel, activity, actions (actionable analytics) ----
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: allPaymentsWithPlan } = await supabase
      .from("payments")
      .select("member_id, plan_id, created_at")
      .eq("status", "success")
      .in("plan_id", ["month_pass", "half_year_pass", "year_pass", "explorer_month", "explorer_year", "until_end_of_year", "day_pass", "newbie_class", "visit_5", "visit_10", "visit_20"]);
    const paymentsWithPlan = (allPaymentsWithPlan ?? []) as { member_id: string; plan_id: string; created_at: string }[];
    const latestPlanByMember = new Map<string, { plan_id: string; created_at: string }>();
    for (const p of paymentsWithPlan) {
      const existing = latestPlanByMember.get(p.member_id);
      if (!existing || p.created_at > existing.created_at) latestPlanByMember.set(p.member_id, { plan_id: p.plan_id, created_at: p.created_at });
    }
    const planToDisplayCategory = (planId: string): "30_day" | "180_day" | "365_day" | "visit_pass" | "day_pass" | "newbie" | "other" => {
      if (planId === "month_pass" || planId === "explorer_month") return "30_day";
      if (planId === "half_year_pass") return "180_day";
      if (planId === "year_pass" || planId === "explorer_year" || planId === "until_end_of_year") return "365_day";
      if (planId?.startsWith("visit_")) return "visit_pass";
      if (planId === "day_pass") return "day_pass";
      if (planId === "newbie_class") return "newbie";
      return "other";
    };

    const { data: recentCheckins } = await supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .gte("timestamp", ninetyDaysAgo);
    const lastVisitByMember = new Map<string, string>();
    for (const c of (recentCheckins ?? []) as { member_id: string; timestamp: string }[]) {
      const existing = lastVisitByMember.get(c.member_id);
      if (!existing || c.timestamp > existing) lastVisitByMember.set(c.member_id, c.timestamp);
    }

    const distributionByPlan: Record<string, { count: number; pct: number; active_count: number }> = {
      "30_day": { count: 0, pct: 0, active_count: 0 },
      "180_day": { count: 0, pct: 0, active_count: 0 },
      "365_day": { count: 0, pct: 0, active_count: 0 },
      visit_pass: { count: 0, pct: 0, active_count: 0 },
      day_pass: { count: 0, pct: 0, active_count: 0 },
    };
    const healthByPlan: Record<string, { active: number; at_risk: number; inactive: number; expiring_soon: number }> = {};
    const planLabels = ["30_day", "180_day", "365_day", "visit_pass", "day_pass"] as const;
    for (const k of planLabels) healthByPlan[k] = { active: 0, at_risk: 0, inactive: 0, expiring_soon: 0 };

    let expiringSoonTotal = 0;
    let expiring30Total = 0;
    let activeHealth = 0, atRiskHealth = 0, inactiveHealth = 0;

    for (const m of filteredMembers as { id: string; membership_expires_at?: string | null }[]) {
      const mid = m.id;
      const latest = latestPlanByMember.get(mid);
      const category = latest ? planToDisplayCategory(latest.plan_id) : "other";
      if (planLabels.includes(category as typeof planLabels[number])) {
        const key = category as typeof planLabels[number];
        distributionByPlan[key].count++;
        if (uniqueVisitors.has(mid)) distributionByPlan[key].active_count++;
      }
      const lastTs = lastVisitByMember.get(mid);
      const lastVisitDaysAgo = lastTs ? (Date.now() - new Date(lastTs).getTime()) / (24 * 60 * 60 * 1000) : 999;
      const expiresAt = m.membership_expires_at ? new Date(m.membership_expires_at).getTime() : null;
      const expiresInDays = expiresAt ? (expiresAt - Date.now()) / (24 * 60 * 60 * 1000) : null;
      const isExpiringSoon = expiresInDays != null && expiresInDays >= 0 && expiresInDays <= 7;
      if (isExpiringSoon) expiringSoonTotal++;
      if (expiresInDays != null && expiresInDays >= 0 && expiresInDays <= 30) expiring30Total++;
      if (lastVisitDaysAgo <= 7) { activeHealth++; if (latest && planLabels.includes(planToDisplayCategory(latest.plan_id) as typeof planLabels[number])) healthByPlan[planToDisplayCategory(latest.plan_id) as typeof planLabels[number]].active++; }
      else if (lastVisitDaysAgo <= 14) { atRiskHealth++; if (latest && planLabels.includes(planToDisplayCategory(latest.plan_id) as typeof planLabels[number])) healthByPlan[planToDisplayCategory(latest.plan_id) as typeof planLabels[number]].at_risk++; }
      else if (lastVisitDaysAgo > 30) { inactiveHealth++; if (latest && planLabels.includes(planToDisplayCategory(latest.plan_id) as typeof planLabels[number])) healthByPlan[planToDisplayCategory(latest.plan_id) as typeof planLabels[number]].inactive++; }
      if (isExpiringSoon && latest && planLabels.includes(planToDisplayCategory(latest.plan_id) as typeof planLabels[number])) healthByPlan[planToDisplayCategory(latest.plan_id) as typeof planLabels[number]].expiring_soon++;
    }
    const totalWithPlan = planLabels.reduce((s, k) => s + distributionByPlan[k].count, 0);
    for (const k of planLabels) {
      distributionByPlan[k].pct = totalWithPlan > 0 ? Math.round((distributionByPlan[k].count / totalWithPlan) * 1000) / 10 : 0;
    }

    const prevSince = new Date(new Date(since).getTime() - (new Date(until).getTime() - new Date(since).getTime())).toISOString();
    const prevUntil = since;
    const { data: prevPayments } = await supabase.from("payments").select("member_id, plan_id, created_at").eq("status", "success").gte("created_at", prevSince).lte("created_at", prevUntil);
    const prevLatest = new Map<string, string>();
    for (const p of (prevPayments ?? []) as { member_id: string; plan_id: string; created_at: string }[]) {
      if (!["month_pass", "half_year_pass", "year_pass", "explorer_month", "explorer_year", "until_end_of_year", "day_pass", "visit_5", "visit_10", "visit_20"].includes(p.plan_id)) continue;
      const ex = prevLatest.get(p.member_id);
      if (!ex || p.created_at > ex) prevLatest.set(p.member_id, p.plan_id);
    }
    const prevCounts: Record<string, number> = { "30_day": 0, "180_day": 0, "365_day": 0, visit_pass: 0, day_pass: 0 };
    prevLatest.forEach((planId) => {
      const cat = planToDisplayCategory(planId);
      if (planLabels.includes(cat as typeof planLabels[number])) prevCounts[cat as typeof planLabels[number]]++;
    });
    const prevTotal = Object.values(prevCounts).reduce((a, b) => a + b, 0);
    const distributionTrend = planLabels.map((plan) => ({
      plan,
      prev_pct: prevTotal > 0 ? Math.round((prevCounts[plan] / prevTotal) * 1000) / 10 : 0,
      current_pct: distributionByPlan[plan].pct,
    }));

    const newbiePurchasedSet = new Set(paymentsWithPlan.filter((p) => p.plan_id === "newbie_class").map((p) => p.member_id));
    const newbieConvertedToMembership = Array.from(newbiePurchasedSet).filter((mid) => {
      const plans = paymentsWithPlan.filter((p) => p.member_id === mid).map((p) => p.plan_id);
      return plans.some((p) =>
        ["month_pass", "half_year_pass", "year_pass", "explorer_month", "explorer_year"].includes(p)
      );
    }).length;
    const newbieConversionToMembershipPct = newbiePurchasedSet.size > 0 ? Math.round((newbieConvertedToMembership / newbiePurchasedSet.size) * 1000) / 10 : 0;

    const visitsPerMemberInPeriod = new Map<string, number>();
    for (const c of checkins as { member_id: string }[]) {
      const mid = c.member_id;
      visitsPerMemberInPeriod.set(mid, (visitsPerMemberInPeriod.get(mid) ?? 0) + 1);
    }
    let highlyActive = 0, moderate = 0, lowActivity = 0, inactiveSeg = 0;
    if (periodWeeks > 0) {
      visitsPerMemberInPeriod.forEach((visits) => {
        const vpw = visits / periodWeeks;
        if (vpw >= 3) highlyActive++;
        else if (vpw >= 1) moderate++;
        else if (vpw > 0) lowActivity++;
      });
      inactiveSeg = totalMembers - visitsPerMemberInPeriod.size;
    }
    const activitySegmentation = {
      highly_active: highlyActive,
      moderate,
      low_activity: lowActivity,
      inactive: inactiveSeg,
    };

    const actionInsights: { type: string; label_en: string; label_vi: string; count: number; recommendation_en: string; recommendation_vi: string }[] = [];
    if (atRiskHealth > 0) actionInsights.push({ type: "at_risk", label_en: "At-risk members (no visit 7–14 days)", label_vi: "Thành viên có rủi ro (không tới 7–14 ngày)", count: atRiskHealth, recommendation_en: "Run a retention campaign: email or SMS to invite them back.", recommendation_vi: "Chạy chiến dịch giữ chân: email hoặc SMS mời họ quay lại." });
    if (inactiveHealth > 0) actionInsights.push({ type: "inactive", label_en: "Inactive members (30+ days)", label_vi: "Thành viên không hoạt động (30+ ngày)", count: inactiveHealth, recommendation_en: "Reactivation campaign: special offer or reminder.", recommendation_vi: "Chiến dịch kích hoạt lại: ưu đãi hoặc nhắc nhở." });
    if (expiringSoonTotal > 0) actionInsights.push({ type: "expiring_soon", label_en: "Expiring soon (within 7 days)", label_vi: "Sắp hết hạn (trong 7 ngày)", count: expiringSoonTotal, recommendation_en: "Send renewal reminder and offer.", recommendation_vi: "Gửi nhắc gia hạn và ưu đãi." });
    const visitPassCount = distributionByPlan.visit_pass.count;
    if (visitPassCount > 0) actionInsights.push({ type: "visit_pass", label_en: "Visit pass users", label_vi: "Người dùng gói lượt", count: visitPassCount, recommendation_en: "Recommend upgrade to 30-day or 365-day membership.", recommendation_vi: "Đề xuất nâng cấp lên gói 30 ngày hoặc 365 ngày." });
    if (highlyActive > 0) actionInsights.push({ type: "highly_active", label_en: "Highly active (3+ visits/week)", label_vi: "Rất tích cực (3+ lượt/tuần)", count: highlyActive, recommendation_en: "Recommend annual plan for better value.", recommendation_vi: "Đề xuất gói năm để tiết kiệm hơn." });

    // ---- RETENTION: cohort-based (all visits up to period end; eligible = first visit ≥ N days before end) ----
    const { data: allVisitCheckins } = await supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .eq("counts_as_visit", true);
    const timesByMember = new Map<string, number[]>();
    for (const c of (allVisitCheckins ?? []) as { member_id: string; timestamp: string }[]) {
      if (!timesByMember.has(c.member_id)) timesByMember.set(c.member_id, []);
      timesByMember.get(c.member_id)!.push(new Date(c.timestamp).getTime());
    }
    Array.from(timesByMember.values()).forEach((arr: number[]) => arr.sort((a, b) => a - b));
    const endMs = new Date(until).getTime();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const cohortRetention = (daysWindow: number): { num: number; den: number; pct: number } => {
      let num = 0;
      let den = 0;
      Array.from(timesByMember.values()).forEach((times: number[]) => {
        if (times.length === 0) return;
        const first = times[0];
        if (endMs - first < daysWindow * DAY_MS) return;
        den++;
        const returned = times.some((t: number, i: number) => i > 0 && t > first && t - first <= daysWindow * DAY_MS);
        if (returned) num++;
      });
      const pct = den > 0 ? Math.min(100, Math.round(((num / den) * 100 + Number.EPSILON) * 10) / 10) : 0;
      return { num, den, pct };
    };
    const cohortD1 = cohortRetention(1);
    const cohortD7 = cohortRetention(7);
    const cohortD30 = cohortRetention(30);
    const day1Retention = cohortD1.pct;
    const day7Retention = cohortD7.pct;
    const day30Retention = cohortD30.pct;

    const firstByMember = new Map<string, string>();
    Array.from(timesByMember.entries()).forEach(([mid, tms]: [string, number[]]) => {
      if (tms.length) firstByMember.set(mid, new Date(tms[0]).toISOString());
    });
    const firstVisitCount = firstByMember.size;
    const { data: paidAfterFirst } = await supabase.from("payments").select("member_id, created_at").eq("status", "success");

    const { data: newbiePayments } = await supabase
      .from("payments")
      .select("member_id")
      .eq("plan_id", "newbie_class")
      .eq("status", "success");
    const newbiePurchased = new Set((newbiePayments ?? []).map((p: { member_id: string }) => p.member_id));
    const totalWithFirstVisit = firstByMember.size;
    const newbiePurchasedPct =
      totalWithFirstVisit > 0
        ? Math.min(100, Math.round(((newbiePurchased.size / totalWithFirstVisit) * 100 + Number.EPSILON) * 10) / 10)
        : 0;
    let newbieReturn7 = 0,
      newbieReturn30 = 0;
    Array.from(newbiePurchased).forEach((mid) => {
      const first = firstByMember.get(mid);
      if (!first) return;
      const firstTime = new Date(first).getTime();
      const laterCheckins = (checkins as { member_id: string; timestamp: string }[]).filter(
        (c) => c.member_id === mid && new Date(c.timestamp).getTime() > firstTime + 86400000
      );
      const days = laterCheckins.length
        ? (Math.min(...laterCheckins.map((c) => new Date(c.timestamp).getTime())) - firstTime) / (24 * 60 * 60 * 1000)
        : 0;
      if (days <= 7) newbieReturn7++;
      if (days <= 30) newbieReturn30++;
    });
    const newbieReturn7PctRaw = newbiePurchased.size > 0 ? (newbieReturn7 / newbiePurchased.size) * 100 : 0;
    const newbieReturn30PctRaw = newbiePurchased.size > 0 ? (newbieReturn30 / newbiePurchased.size) * 100 : 0;
    const newbieReturn7Pct = Math.min(100, Math.max(0, Math.round((newbieReturn7PctRaw + Number.EPSILON) * 10) / 10));
    const newbieReturn30Pct = Math.min(100, Math.max(0, Math.round((newbieReturn30PctRaw + Number.EPSILON) * 10) / 10));

    // ---- BEHAVIOR: DAU / WAU / MAU, peak hours ----
    const dauByDay = new Map<string, number>();
    for (const c of checkins as { timestamp: string }[]) {
      const d = getGymDateFromISO(c.timestamp);
      dauByDay.set(d, (dauByDay.get(d) ?? 0) + 1);
    }
    const dauArray = Array.from(dauByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    const wauSet = new Set(checkins.map((c: { member_id: string }) => c.member_id));
    const mauSet = wauSet;

    let avgDaysBetweenVisits: number | null = null;
    const gaps: number[] = [];
    for (const times of Array.from(timesByMember.values())) {
      if (times.length < 2) continue;
      for (let i = 1; i < times.length; i++) {
        gaps.push((times[i] - times[i - 1]) / DAY_MS);
      }
    }
    if (gaps.length > 0) {
      avgDaysBetweenVisits = Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10;
    }
    const peakByHour = new Map<number, number>();
    for (const c of checkins as { timestamp: string }[]) {
      const h = new Date(c.timestamp).getHours();
      peakByHour.set(h, (peakByHour.get(h) ?? 0) + 1);
    }
    const peakHours = Array.from(peakByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({ hour, count }));

    // ---- FUNNEL (simplified): % of first-time visitors who ever purchased (numerator only among those with first visit, so <= 100%)
    const paidMemberIds = new Set(((paidAfterFirst ?? []) as { member_id: string }[]).map((p) => p.member_id));
    const firstVisitToPurchaseRaw =
      firstVisitCount > 0
        ? (Array.from(firstByMember.keys()).filter((mid) => paidMemberIds.has(mid)).length / firstVisitCount) * 100
        : 0;
    const firstVisitToPurchase = Math.min(100, Math.round((firstVisitToPurchaseRaw + Number.EPSILON) * 10) / 10);
    const newbieToReturn = newbiePurchased.size > 0 ? newbieReturn7Pct : 0;
    const returnToMembershipRaw =
      uniqueVisitors.size > 0
        ? (filteredMembers.filter((m: { id: string }) => {
            const plans = (payments as { member_id: string; plan_id: string }[]).filter((p) => p.member_id === m.id);
            return plans.some((p) =>
              ["month_pass", "year_pass", "explorer_month", "explorer_year", "half_year_pass", "until_end_of_year"].includes(p.plan_id)
            );
          }).length /
          uniqueVisitors.size) *
          100
        : 0;
    const returnToMembership = Math.min(100, Math.round((returnToMembershipRaw + Number.EPSILON) * 10) / 10);

    // ---- OPERATIONS: tasks, route resets, coaching ----
    const { data: taskRows } = await supabase
      .from("staff_tasks")
      .select("id, status, completed_at, due_date")
      .gte("due_date", since.slice(0, 10))
      .lte("due_date", until.slice(0, 10));
    const tasks = taskRows ?? [];
    const tasksCompleted = tasks.filter((t: { status: string }) => t.status === "completed").length;
    const tasksOverdue = tasks.filter(
      (t: { status: string; due_date: string }) => t.status !== "completed" && t.due_date < getGymToday()
    ).length;
    const completionRate = tasks.length > 0 ? (tasksCompleted / tasks.length) * 100 : 0;

    const { data: zones } = await supabase.from("route_zones").select("id, name, next_reset_at");
    const now = new Date().toISOString();
    const routeResetsOverdue = (zones ?? []).filter(
      (z: { next_reset_at: string | null }) => z.next_reset_at && z.next_reset_at < now
    ).length;

    const { data: sessionRows } = await supabase
      .from("coaching_sessions")
      .select("id, coach_id, status, start_time")
      .gte("start_time", since)
      .lte("start_time", until);
    const sessions = sessionRows ?? [];
    const coachingCompleted = sessions.filter((s: { status: string }) => s.status === "completed").length;
    const coachingMissed = sessions.filter(
      (s: { status: string; coach_id: string | null }) => s.status !== "cancelled" && !s.coach_id
    ).length;

    // ---- STAFF PERFORMANCE (for period = month or custom range) ----
    const { data: staffProfiles } = await supabase
      .from("staff_profiles")
      .select("id, display_name, email, role");
    const staffList = staffProfiles ?? [];
    const staffPerformance: {
      staff_id: string;
      display_name: string;
      email: string;
      role: string;
      sales: number;
      commission: number;
      tasks_completed: number;
      attendance_days: number;
    }[] = [];

    for (const staff of staffList as { id: string; display_name: string | null; email: string; role: string }[]) {
      const sales =
        (pos as { staff_id: string | null; total: number }[])
          .filter((p) => p.staff_id === staff.id)
          .reduce((sum, p) => sum + p.total, 0) ?? 0;
      const commission =
        (pos as { staff_id: string | null; commission_amount: number | null }[])
          .filter((p) => p.staff_id === staff.id)
          .reduce((sum, p) => sum + (p.commission_amount ?? 0), 0) ?? 0;
      const { data: completedTaskLogRows } = await supabase
        .from("task_logs")
        .select("id")
        .eq("staff_id", staff.id)
        .gte("completed_at", since)
        .lte("completed_at", until);
      const tasksCompletedStaff = (completedTaskLogRows ?? []).length;
      const { data: attRows } = await supabase
        .from("staff_attendance")
        .select("date")
        .eq("staff_id", staff.id)
        .eq("status", "IN")
        .gte("date", since.slice(0, 10))
        .lte("date", until.slice(0, 10));
      const attendanceDays = (attRows ?? []).length;
      staffPerformance.push({
        staff_id: staff.id,
        display_name: staff.display_name ?? staff.email ?? "—",
        email: staff.email,
        role: staff.role,
        sales,
        commission,
        tasks_completed: Number(tasksCompletedStaff),
        attendance_days: attendanceDays,
      });
    }

    const totalVisits = checkins.length;
    const uniqueMembersRevenue = new Set((payments as { member_id: string }[]).map((p) => p.member_id));
    const arpu = uniqueMembersRevenue.size > 0 ? totalRevenue / uniqueMembersRevenue.size : 0;
    const revenuePerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0;

    const membershipPlanIds = new Set([
      "month_pass",
      "half_year_pass",
      "year_pass",
      "explorer_month",
      "explorer_year",
      "until_end_of_year",
    ]);
    const memPays = paymentsWithPlan.filter((p) => membershipPlanIds.has(p.plan_id));
    const sinceMs = new Date(since).getTime();
    const untilMs = new Date(until).getTime();
    const firstMemPayTime = new Map<string, number>();
    for (const p of [...memPays].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const tm = new Date(p.created_at).getTime();
      if (!firstMemPayTime.has(p.member_id)) firstMemPayTime.set(p.member_id, tm);
    }
    let newMembersMtd = 0;
    Array.from(firstMemPayTime.values()).forEach((t: number) => {
      if (t >= sinceMs && t <= untilMs) newMembersMtd++;
    });
    const renewalMembers = new Set<string>();
    for (const p of memPays) {
      const tm = new Date(p.created_at).getTime();
      if (tm < sinceMs || tm > untilMs) continue;
      const first = firstMemPayTime.get(p.member_id);
      if (first != null && first < sinceMs) renewalMembers.add(p.member_id);
    }
    const renewalsMtd = renewalMembers.size;

    const nowIso = new Date().toISOString();
    const in7Iso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const in14Iso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const in30Iso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: currentPayingMembers } = await supabase
      .from("member_profiles")
      .select("id", { count: "exact", head: true })
      .eq("membership_status", "active")
      .gt("membership_expires_at", nowIso);
    const { data: exp7Ids } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("membership_status", "active")
      .gte("membership_expires_at", nowIso)
      .lte("membership_expires_at", in7Iso);
    const { data: exp14Ids } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("membership_status", "active")
      .gt("membership_expires_at", in7Iso)
      .lte("membership_expires_at", in14Iso);
    const { data: exp30Ids } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("membership_status", "active")
      .gte("membership_expires_at", nowIso)
      .lte("membership_expires_at", in30Iso);

    const todayGym = getGymToday();
    const { count: checkinsToday } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("counts_as_visit", true)
      .gte("timestamp", getGymStartOfDay(todayGym))
      .lte("timestamp", getGymEndOfDay(todayGym));

    const { data: newbieSessionsToday } = await supabase
      .from("coaching_sessions")
      .select("id")
      .eq("session_type", "beginner")
      .gte("start_time", getGymStartOfDay(todayGym))
      .lte("start_time", getGymEndOfDay(todayGym));

    const { count: staffOnShiftToday } = await supabase
      .from("staff_attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", todayGym)
      .eq("status", "IN");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentCampaigns } = await supabase
      .from("campaign_logs")
      .select("segment")
      .gte("sent_at", sevenDaysAgo)
      .in("segment", ["expiring_soon_7d", "inactive_members_30d"]);
    const recentSegments = new Set((recentCampaigns ?? []).map((r: { segment: string }) => r.segment));
    const campaign_suppress = {
      expiring_7d: recentSegments.has("expiring_soon_7d"),
      inactive_30: recentSegments.has("inactive_members_30d"),
    };

    return NextResponse.json(
      {
        filters: { period: label, since, until, period_horizon: periodHorizon, period_since: since, period_until: until, member_type: memberType, activity, activity_level: activityLevel },
        fetched_at: new Date().toISOString(),
        retention_cohort: {
          d1: { pct: cohortD1.pct, numerator: cohortD1.num, denominator: cohortD1.den },
          d7: { pct: cohortD7.pct, numerator: cohortD7.num, denominator: cohortD7.den },
          d30: { pct: cohortD30.pct, numerator: cohortD30.num, denominator: cohortD30.den },
        },
        ceo_snapshot: {
          checkins_today: checkinsToday ?? 0,
          newbie_class_sessions_today: (newbieSessionsToday ?? []).length,
          staff_on_shift_today: staffOnShiftToday ?? 0,
          current_paying_members: currentPayingMembers ?? 0,
          renewals_mtd: renewalsMtd,
          new_members_mtd: newMembersMtd,
          expiring_7d_all: (exp7Ids ?? []).length,
          expiring_14d_all: (exp14Ids ?? []).length,
          expiring_30d_all: (exp30Ids ?? []).length,
        },
        overview: {
          total_revenue: totalRevenue,
          total_members: totalMembers,
          active_members: activeCount,
          total_visits: totalVisits,
        },
        revenue: {
          total: totalRevenue,
          by_category: revenueByCategory,
          over_time: revenueOverTime,
          arpu: Math.round(arpu),
          revenue_per_visit: totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0,
        },
        members: {
          total: totalMembers,
          active: activeCount,
          inactive: inactiveCount,
          new_over_time: newOverTime,
          churn_rate: Math.round(churnRate * 10) / 10,
          avg_visits_per_member: Math.round(avgVisitsPerMember * 10) / 10,
          membership_distribution: {
            by_plan: distributionByPlan,
            trend: distributionTrend,
          },
          member_health: {
            active: activeHealth,
            at_risk: atRiskHealth,
            inactive: inactiveHealth,
            expiring_soon: expiringSoonTotal,
            expiring_30_days: expiring30Total,
            by_plan: healthByPlan,
          },
          newbie_conversion_funnel: {
            purchased_count: newbiePurchased.size,
            return_7_days_pct: Math.round(newbieReturn7Pct * 10) / 10,
            return_30_days_pct: Math.round(newbieReturn30Pct * 10) / 10,
            converted_to_membership_pct: newbieConversionToMembershipPct,
          },
          activity_segmentation: activitySegmentation,
          action_insights: actionInsights,
        },
        retention: {
          day1: Math.round(day1Retention * 10) / 10,
          day7: Math.round(day7Retention * 10) / 10,
          day30: Math.round(day30Retention * 10) / 10,
          newbie_purchased_pct: Math.round(newbiePurchasedPct * 10) / 10,
          newbie_purchased_num: newbiePurchased.size,
          newbie_purchased_den: totalWithFirstVisit,
          newbie_return_7_pct: newbieReturn7Pct,
          newbie_return_7_num: newbieReturn7,
          newbie_return_7_den: newbiePurchased.size,
          newbie_return_30_pct: newbieReturn30Pct,
          newbie_return_30_num: newbieReturn30,
          newbie_return_30_den: newbiePurchased.size,
        },
        behavior: {
          dau: dauArray,
          wau: wauSet.size,
          mau: mauSet.size,
          avg_days_between_visits: avgDaysBetweenVisits,
          visits_per_user: totalMembers > 0 ? Array.from(uniqueVisitors).map((id) => ({ member_id: id, visits: checkins.filter((c: { member_id: string }) => c.member_id === id).length })) : [],
          peak_hours: peakHours,
        },
        funnel: {
          first_visit_to_purchase: Math.round(firstVisitToPurchase * 10) / 10,
          newbie_to_return: Math.round(newbieToReturn * 10) / 10,
          return_to_membership: Math.round(returnToMembership * 10) / 10,
        },
        operations: {
          tasks_completed: tasksCompleted,
          tasks_overdue: tasksOverdue,
          completion_rate: Math.round(completionRate * 10) / 10,
          route_resets_overdue: routeResetsOverdue,
          coaching_completed: coachingCompleted,
          coaching_missed: coachingMissed,
        },
        staff: staffPerformance,
        campaign_suppress,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("analytics error", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
