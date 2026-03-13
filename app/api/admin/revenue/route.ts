import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

const PLAN_LABELS: Record<string, string> = {
  day_pass: "Day Pass",
  explorer_month: "Explorer Monthly",
  explorer_year: "Explorer Yearly",
  until_end_of_year: "Until end of year",
};

/**
 * GET /api/admin/revenue
 * ?period=day|week|month — aggregate revenue for period ending today
 */
export async function GET(req: NextRequest) {
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

    const payments = (rows ?? []).map((r) => ({
      id: r.id,
      plan_id: r.plan_id,
      plan_name: PLAN_LABELS[r.plan_id as string] ?? r.plan_id,
      amount: r.amount,
      method: r.method,
      created_at: r.created_at,
    }));

    let total = 0;
    const byPlan: Record<string, number> = {};
    for (const pay of payments) {
      total += pay.amount;
      const key = pay.plan_id as string;
      byPlan[key] = (byPlan[key] ?? 0) + pay.amount;
    }

    const byPlanLabel: Record<string, number> = {};
    for (const [planId, amt] of Object.entries(byPlan)) {
      byPlanLabel[PLAN_LABELS[planId] ?? planId] = amt;
    }

    return NextResponse.json(
      {
        period: p,
        total,
        byPlan: byPlanLabel,
        payments,
        since: since.toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("admin revenue error", e);
    return NextResponse.json({ error: "Failed to load revenue" }, { status: 500 });
  }
}
