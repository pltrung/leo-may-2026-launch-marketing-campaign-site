import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

const PLAN_LABELS: Record<string, string> = {
  day_pass: "1 Day Pass",
  month_pass: "30 Day Pass",
  year_pass: "365 Day Pass",
  newbie_class: "Newbie Class",
  visit_5: "5 Visit Pass",
  visit_10: "10 Visit Pass",
  visit_20: "20 Visit Pass",
  explorer_month: "Explorer Monthly",
  explorer_year: "Explorer Yearly",
  until_end_of_year: "Until end of year",
};

/**
 * GET /api/admin/revenue
 * ?period=day|week|month — aggregate revenue for period ending today
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const period = req.nextUrl.searchParams.get("period") ?? "day";
  const validPeriods = ["day", "week", "month"];
  const p = validPeriods.includes(period) ? period : "day";

  try {
    const now = new Date();
    let since: Date;
    if (p === "day") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (p === "week") {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
      since = start;
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    const { data: rows, error } = await supabase
      .from("payments")
      .select("id, plan_id, amount, method, created_at")
      .gte("created_at", since.toISOString())
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: posRows } = await supabase
      .from("pos_transactions")
      .select("id, total, payment_method, created_at")
      .gte("created_at", since.toISOString())
      .eq("payment_status", "success")
      .order("created_at", { ascending: false });

    const payments = (rows ?? []).map((r: { id: string; plan_id: string; amount: number; method: string; created_at: string }) => ({
      id: r.id,
      plan_id: r.plan_id,
      plan_name: PLAN_LABELS[r.plan_id] ?? r.plan_id,
      amount: r.amount,
      method: r.method,
      created_at: r.created_at,
      revenue_type: "membership_pass",
    }));

    const retailPayments = (posRows ?? []).map((r: { id: string; total: number; payment_method: string; created_at: string }) => ({
      id: r.id,
      plan_id: "retail",
      plan_name: "Retail",
      amount: r.total,
      method: r.payment_method,
      created_at: r.created_at,
      revenue_type: "retail",
    }));

    const allPayments = [...payments, ...retailPayments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let total = 0;
    const byPlan: Record<string, number> = {};
    for (const pay of payments) {
      total += pay.amount;
      const key = pay.plan_id as string;
      byPlan[key] = (byPlan[key] ?? 0) + pay.amount;
    }
    for (const pay of retailPayments) {
      total += pay.amount;
      byPlan["retail"] = (byPlan["retail"] ?? 0) + pay.amount;
    }

    const byPlanLabel: Record<string, number> = {};
    for (const [planId, amt] of Object.entries(byPlan)) {
      byPlanLabel[planId === "retail" ? "Retail" : (PLAN_LABELS[planId] ?? planId)] = amt;
    }

    return NextResponse.json(
      {
        period: p,
        total,
        byPlan: byPlanLabel,
        payments: allPayments,
        since: since.toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("admin revenue error", e);
    return NextResponse.json({ error: "Failed to load revenue" }, { status: 500 });
  }
}
