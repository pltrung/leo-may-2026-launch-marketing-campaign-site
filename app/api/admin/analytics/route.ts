/**
 * GET /api/admin/analytics
 * Admin-only. Returns aggregated analytics for the dashboard.
 * Query: period=day|week|month, from=YYYY-MM-DD, to=YYYY-MM-DD (optional custom),
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
  getGymEndOfDay,
  getGymDateFromISO,
} from "@/lib/gymTimezone";

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
    return { since, until: getGymEndOfDay(), label: "week" };
  }
  if (period === "month") {
    const since = getGymStartOfMonth();
    return { since, until: getGymEndOfDay(), label: "month" };
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
  const period = url.searchParams.get("period") ?? "month";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const memberType = url.searchParams.get("member_type") ?? "all";
  const activity = url.searchParams.get("activity") ?? "all";

  const { since, until, label } = parseDateRange(period, fromParam, toParam);
  const supabase = createServerClient();

  try {
    // Optional: resolve member IDs by segment (member_type + activity). For simplicity we run all queries in range; filters can be applied in a second pass or via subqueries.
    let memberIdsFilter: string[] | null = null;
    if (memberType !== "all" || activity !== "all") {
      const { data: allMembers } = await supabase.from("member_profiles").select("id").limit(5000);
      const ids = (allMembers ?? []).map((r: { id: string }) => r.id);
      if (ids.length === 0) {
        return NextResponse.json({
          filters: { period: label, since, until, member_type: memberType, activity },
          overview: { total_revenue: 0, total_members: 0, active_members: 0, total_visits: 0 },
          revenue: { total: 0, by_category: {}, over_time: [], arpu: 0, revenue_per_visit: 0 },
          members: { total: 0, active: 0, inactive: 0, new_over_time: [], churn_rate: 0, avg_visits_per_member: 0 },
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

    const memberFilter = memberIdsFilter && memberIdsFilter.length > 0 ? memberIdsFilter : null;

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
      .select("id, created_at, membership_status");
    const allMembers = memberRows ?? [];
    const membersInRange = allMembers.filter((m: { id: string; created_at: string }) => {
      const created = (m as { created_at: string }).created_at;
      return created >= since && created <= until;
    });
    const filteredMembers =
      memberFilter === null ? allMembers : allMembers.filter((m: { id: string }) => memberFilter.includes(m.id));
    const { data: checkinRows } = await supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .gte("timestamp", since)
      .lte("timestamp", until);
    let checkins = checkinRows ?? [];
    if (memberFilter) checkins = checkins.filter((c: { member_id: string }) => memberFilter.includes(c.member_id));
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
      .gte("timestamp", prevPeriodStart)
      .lt("timestamp", since);
    const prevActive = new Set((prevCheckins ?? []).map((c: { member_id: string }) => c.member_id));
    const churned = filteredMembers.filter(
      (m: { id: string }) => prevActive.has(m.id) && !uniqueVisitors.has(m.id)
    ).length;
    const churnRate = prevActive.size > 0 ? (churned / prevActive.size) * 100 : 0;

    // ---- RETENTION (simplified) ----
    const { data: firstCheckins } = await supabase
      .from("gym_checkins")
      .select("member_id, timestamp");
    const firstByMember = new Map<string, string>();
    for (const c of (firstCheckins ?? []) as { member_id: string; timestamp: string }[]) {
      const existing = firstByMember.get(c.member_id);
      if (!existing || c.timestamp < existing) firstByMember.set(c.member_id, c.timestamp);
    }
    const firstVisitCount = firstByMember.size;
    const { data: paidAfterFirst } = await supabase.from("payments").select("member_id, created_at").eq("status", "success");
    let day1Return = 0,
      day7Return = 0,
      day30Return = 0;
    Array.from(firstByMember.entries()).forEach(([mid, firstTs]) => {
      const first = new Date(firstTs).getTime();
      const hasCheckin = (checkins as { member_id: string; timestamp: string }[]).some(
        (c) => c.member_id === mid && new Date(c.timestamp).getTime() > first
      );
      if (!hasCheckin) return;
      const checkinTimes = (checkins as { member_id: string; timestamp: string }[])
        .filter((c) => c.member_id === mid)
        .map((c) => new Date(c.timestamp).getTime());
      for (const t of checkinTimes) {
        const days = (t - first) / (24 * 60 * 60 * 1000);
        if (days >= 1 && days < 2) day1Return++;
        if (days >= 1 && days <= 7) day7Return++;
        if (days >= 1 && days <= 30) day30Return++;
      }
    });
    const day1Retention = firstVisitCount > 0 ? (day1Return / firstVisitCount) * 100 : 0;
    const day7Retention = firstVisitCount > 0 ? (day7Return / firstVisitCount) * 100 : 0;
    const day30Retention = firstVisitCount > 0 ? (day30Return / firstVisitCount) * 100 : 0;

    const { data: newbiePayments } = await supabase
      .from("payments")
      .select("member_id")
      .eq("plan_id", "newbie_class")
      .eq("status", "success");
    const newbiePurchased = new Set((newbiePayments ?? []).map((p: { member_id: string }) => p.member_id));
    const totalWithFirstVisit = firstByMember.size;
    const newbiePurchasedPct = totalWithFirstVisit > 0 ? (newbiePurchased.size / totalWithFirstVisit) * 100 : 0;
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
    const newbieReturn7Pct = newbiePurchased.size > 0 ? (newbieReturn7 / newbiePurchased.size) * 100 : 0;
    const newbieReturn30Pct = newbiePurchased.size > 0 ? (newbieReturn30 / newbiePurchased.size) * 100 : 0;

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
    const peakByHour = new Map<number, number>();
    for (const c of checkins as { timestamp: string }[]) {
      const h = new Date(c.timestamp).getHours();
      peakByHour.set(h, (peakByHour.get(h) ?? 0) + 1);
    }
    const peakHours = Array.from(peakByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({ hour, count }));

    // ---- FUNNEL (simplified) ----
    const firstVisitToPurchase = firstVisitCount > 0 && paidAfterFirst
      ? (new Set((paidAfterFirst as { member_id: string }[]).map((p) => p.member_id)).size / firstVisitCount) * 100
      : 0;
    const newbieToReturn = newbiePurchased.size > 0 ? newbieReturn7Pct : 0;
    const returnToMembership =
      uniqueVisitors.size > 0
        ? (filteredMembers.filter((m: { id: string }) => {
            const plans = (payments as { member_id: string; plan_id: string }[]).filter((p) => p.member_id === m.id);
            return plans.some((p) =>
              ["month_pass", "year_pass", "explorer_month", "explorer_year"].includes(p.plan_id)
            );
          }).length /
          uniqueVisitors.size) *
          100
        : 0;

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
      const { data: completedTaskRows } = await supabase
        .from("staff_tasks")
        .select("id")
        .eq("assigned_to", staff.id)
        .eq("status", "completed")
        .gte("completed_at", since)
        .lte("completed_at", until);
      const tasksCompletedStaff = (completedTaskRows ?? []).length;
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

    return NextResponse.json(
      {
        filters: { period: label, since, until, member_type: memberType, activity },
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
        },
        retention: {
          day1: Math.round(day1Retention * 10) / 10,
          day7: Math.round(day7Retention * 10) / 10,
          day30: Math.round(day30Retention * 10) / 10,
          newbie_purchased_pct: Math.round(newbiePurchasedPct * 10) / 10,
          newbie_return_7_pct: Math.round(newbieReturn7Pct * 10) / 10,
          newbie_return_30_pct: Math.round(newbieReturn30Pct * 10) / 10,
        },
        behavior: {
          dau: dauArray,
          wau: wauSet.size,
          mau: mauSet.size,
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
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("analytics error", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
