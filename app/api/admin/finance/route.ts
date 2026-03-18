/**
 * GET /api/admin/finance — summary, MTD, expenses, payroll, 6-month history, reorders
 * POST — action: expense | reorder_expense | snapshot
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import {
  getGymToday,
  getGymStartOfMonth,
  getGymEndOfDay,
  getGymMonthBoundaries,
  getGymStartOfDay,
} from "@/lib/gymTimezone";

function addCalendarMonths(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

type StaffRow = {
  id: string;
  display_name: string | null;
  email: string;
  role: string;
  monthly_salary: number | null;
  commission_rate: number | null;
};

function payrollForPeriod(
  staffList: StaffRow[],
  posRows: { staff_id: string | null; total: number; commission_amount: number | null }[]
): {
  lines: {
    staff_id: string;
    name: string;
    role: string;
    monthly_salary: number;
    sales_mtd: number;
    variable_pay: number;
    variable_source: "rate" | "commission";
    line_total: number;
    commission_rate: number;
  }[];
  total: number;
} {
  const lines: {
    staff_id: string;
    name: string;
    role: string;
    monthly_salary: number;
    sales_mtd: number;
    variable_pay: number;
    variable_source: "rate" | "commission";
    line_total: number;
    commission_rate: number;
  }[] = [];
  let payrollTotal = 0;
  for (const s of staffList) {
    const pos = posRows.filter((p) => p.staff_id === s.id);
    const salesMtd = pos.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const actualComm = pos.reduce((sum, p) => sum + (Number(p.commission_amount) || 0), 0);
    const rate = Number(s.commission_rate) || 0;
    const variable = rate > 0 ? Math.round(salesMtd * rate) : actualComm;
    const salary = Number(s.monthly_salary) || 0;
    const lineTotal = salary + variable;
    payrollTotal += lineTotal;
    lines.push({
      staff_id: s.id,
      name: s.display_name || s.email,
      role: s.role,
      monthly_salary: salary,
      sales_mtd: salesMtd,
      variable_pay: variable,
      variable_source: rate > 0 ? "rate" : "commission",
      line_total: lineTotal,
      commission_rate: rate,
    });
  }
  return { lines, total: payrollTotal };
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = getGymToday();
  const monthStartIso = getGymStartOfMonth();
  const monthStartDate = monthStartIso.slice(0, 10);
  const monthKey = today.slice(0, 7);
  const untilIso = getGymEndOfDay(today);

  try {
    const { data: configRows } = await supabase.from("finance_config").select("*").limit(1);
    const config = (configRows?.[0] as Record<string, unknown>) ?? {
      rent_amount: 0,
      rent_due_day: 1,
      payroll_day: 25,
      current_cash: 0,
    };

    const { data: paymentRows } = await supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", monthStartIso)
      .lte("created_at", untilIso)
      .eq("status", "success");
    const { data: posRowsMtd } = await supabase
      .from("pos_transactions")
      .select("total, created_at")
      .gte("created_at", monthStartIso)
      .lte("created_at", untilIso)
      .eq("payment_status", "success");

    let revenueMtd = 0;
    for (const p of paymentRows ?? []) revenueMtd += Number((p as { amount: number }).amount) || 0;
    for (const r of posRowsMtd ?? []) revenueMtd += Number((r as { total: number }).total) || 0;

    const { data: posStaffRows } = await supabase
      .from("pos_transactions")
      .select("staff_id, total, commission_amount, created_at")
      .gte("created_at", monthStartIso)
      .lte("created_at", untilIso)
      .eq("payment_status", "success");

    const { data: staffListRaw } = await supabase
      .from("staff_profiles")
      .select("id, display_name, email, role, monthly_salary, commission_rate");

    const staffList = (staffListRaw ?? []) as StaffRow[];
    const posStaff = (posStaffRows ?? []) as {
      staff_id: string | null;
      total: number;
      commission_amount: number | null;
    }[];

    const { lines: payrollLines, total: payrollTotal } = payrollForPeriod(staffList, posStaff);

    const rentAmount = Number(config.rent_amount) || 0;

    const { data: expenseRows } = await supabase
      .from("expenses")
      .select(
        "id, expense_date, category, item_name, quantity, cost, notes, reorder_request_id, created_at, created_by_staff_id"
      )
      .gte("expense_date", monthStartDate)
      .lte("expense_date", today)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    let expensesMtd = 0;
    for (const e of expenseRows ?? []) {
      expensesMtd += Number((e as { cost: number }).cost) || 0;
    }

    const monthlyCosts = payrollTotal + rentAmount + expensesMtd;
    const profit = revenueMtd - monthlyCosts;
    const cash = Number(config.current_cash) || 0;
    const runwayMonths =
      monthlyCosts > 0 ? Math.round((cash / monthlyCosts) * 10) / 10 : null;

    const { data: prRow } = await supabase
      .from("payroll_records")
      .select("id, month_key, total_amount, status, paid_at")
      .eq("month_key", monthKey)
      .maybeSingle();

    if (!prRow || (prRow as { status: string }).status !== "paid") {
      await supabase.from("payroll_records").upsert(
        {
          month_key: monthKey,
          total_amount: payrollTotal,
          status: (prRow as { status?: string })?.status ?? "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "month_key" }
      );
    }

    const { data: prFinal } = await supabase
      .from("payroll_records")
      .select("id, month_key, total_amount, status, paid_at")
      .eq("month_key", monthKey)
      .maybeSingle();

    const rentDueDay = Number(config.rent_due_day) || 1;
    const payrollDay = Number(config.payroll_day) || 25;
    const [ty, tm] = today.split("-").map(Number);
    let rentDueStr = `${ty}-${String(tm).padStart(2, "0")}-${String(rentDueDay).padStart(2, "0")}`;
    if (rentDueStr < today) {
      const n = addCalendarMonths(ty, tm, 1);
      rentDueStr = `${n.y}-${String(n.m).padStart(2, "0")}-${String(rentDueDay).padStart(2, "0")}`;
    }
    const payrollDueStr = `${ty}-${String(tm).padStart(2, "0")}-${String(payrollDay).padStart(2, "0")}`;
    const payrollStatus =
      (prFinal as { status?: string })?.status === "paid" ? "paid" : "pending";

    const { data: reorderRows } = await supabase
      .from("inventory_reorder_requests")
      .select("id, variant_id, quantity_requested, note, status, created_at, estimated_unit_cost")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(50);

    const variantIds = Array.from(
      new Set((reorderRows ?? []).map((r: { variant_id: string }) => r.variant_id))
    );
    const variantLabels: Record<string, string> = {};
    if (variantIds.length) {
      const { data: vars } = await supabase
        .from("product_variants")
        .select("id, sku, product_id, products(name)")
        .in("id", variantIds);
      for (const v of vars ?? []) {
        const row = v as { id: string; sku: string; products?: { name: string } | { name: string }[] };
        const pname = Array.isArray(row.products) ? row.products[0]?.name : row.products?.name;
        variantLabels[row.id] = [pname, row.sku].filter(Boolean).join(" · ") || row.sku;
      }
    }

    const pending_reorders = (reorderRows ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      variant_label: variantLabels[String(r.variant_id)] ?? String(r.variant_id).slice(0, 8),
    }));

    const { data: snapshotRows } = await supabase
      .from("finance_monthly_snapshots")
      .select("*")
      .order("month_key", { ascending: false })
      .limit(24);

    const tyNum = Number(today.slice(0, 4));
    const tmNum = Number(today.slice(5, 7));
    const months_history: {
      month_key: string;
      revenue: number;
      expenses_total: number;
      payroll_total: number;
      rent: number;
      costs_total: number;
      profit: number;
    }[] = [];

    for (let i = 0; i < 6; i++) {
      const { y, m } = addCalendarMonths(tyNum, tmNum, -i);
      const mk = `${y}-${String(m).padStart(2, "0")}`;
      const { start, end } = getGymMonthBoundaries(y, m);
      const since = getGymStartOfDay(start);
      const untilM = getGymEndOfDay(end);

      const { data: prM } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", since)
        .lte("created_at", untilM)
        .eq("status", "success");
      const { data: posM } = await supabase
        .from("pos_transactions")
        .select("total, created_at")
        .gte("created_at", since)
        .lte("created_at", untilM)
        .eq("payment_status", "success");
      let rev = 0;
      for (const p of prM ?? []) rev += Number((p as { amount: number }).amount) || 0;
      for (const r of posM ?? []) rev += Number((r as { total: number }).total) || 0;

      const { data: expM } = await supabase
        .from("expenses")
        .select("cost")
        .gte("expense_date", start)
        .lte("expense_date", end);
      let expSum = 0;
      for (const e of expM ?? []) expSum += Number((e as { cost: number }).cost) || 0;

      const { data: posStaffM } = await supabase
        .from("pos_transactions")
        .select("staff_id, total, commission_amount, created_at")
        .gte("created_at", since)
        .lte("created_at", untilM)
        .eq("payment_status", "success");

      const { total: payM } = payrollForPeriod(
        staffList,
        (posStaffM ?? []) as { staff_id: string | null; total: number; commission_amount: number | null }[]
      );

      const costs = payM + rentAmount + expSum;
      months_history.push({
        month_key: mk,
        revenue: rev,
        expenses_total: expSum,
        payroll_total: payM,
        rent: rentAmount,
        costs_total: costs,
        profit: rev - costs,
      });
    }

    const nameByStaff: Record<string, string> = {};
    for (const s of staffList) {
      nameByStaff[s.id] = s.display_name || s.email;
    }

    return NextResponse.json({
      month_key: monthKey,
      config: {
        rent_amount: rentAmount,
        rent_due_day: rentDueDay,
        payroll_day: payrollDay,
        current_cash: cash,
      },
      revenue_mtd: revenueMtd,
      payroll_total: payrollTotal,
      payroll_lines: payrollLines,
      rent_amount: rentAmount,
      expenses_mtd: expensesMtd,
      expenses_list: (expenseRows ?? []).map((e: Record<string, unknown>) => ({
        ...e,
        created_by_name:
          e.created_by_staff_id && nameByStaff[String(e.created_by_staff_id)]
            ? nameByStaff[String(e.created_by_staff_id)]
            : null,
      })),
      monthly_costs: monthlyCosts,
      profit,
      runway_months: runwayMonths,
      fixed_costs: [
        {
          category: "Rent",
          item: "Rent",
          amount: rentAmount,
          due_date: rentDueStr,
          status: "—",
        },
        {
          category: "Payroll",
          item: "Monthly payroll (est.)",
          amount: payrollTotal,
          due_date: payrollDueStr,
          status: payrollStatus === "paid" ? "Paid" : "Pending",
        },
      ],
      payroll_record: prFinal ?? { month_key: monthKey, total_amount: payrollTotal, status: "pending" },
      pending_reorders,
      snapshots: snapshotRows ?? [],
      months_history,
    });
  } catch (e) {
    console.error("finance GET", e);
    return NextResponse.json({ error: "Failed to load finance data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "");
  const supabase = createServerClient();
  const staffId = unified.staffId;

  try {
    if (action === "expense") {
      const category = String(body.category || "");
      if (!["inventory", "equipment", "misc"].includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      const item_name = String(body.item_name || "").trim();
      const quantity = Math.max(1, Number(body.quantity) || 1);
      const cost = Number(body.cost);
      if (!item_name || !Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ error: "item_name and valid cost required" }, { status: 400 });
      }
      const expense_date = body.expense_date
        ? String(body.expense_date).slice(0, 10)
        : getGymToday();

      const { data: row, error } = await supabase
        .from("expenses")
        .insert({
          category,
          item_name,
          quantity,
          cost,
          expense_date,
          created_by_staff_id: staffId,
          notes: body.notes ? String(body.notes) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: row?.id });
    }

    if (action === "reorder_expense") {
      const reorder_id = String(body.reorder_id || "");
      const total_cost = Number(body.total_cost);
      if (!reorder_id || !Number.isFinite(total_cost) || total_cost < 0) {
        return NextResponse.json({ error: "reorder_id and total_cost required" }, { status: 400 });
      }
      const { data: reqRow, error: rErr } = await supabase
        .from("inventory_reorder_requests")
        .select("id, variant_id, quantity_requested, note")
        .eq("id", reorder_id)
        .maybeSingle();
      if (rErr || !reqRow) {
        return NextResponse.json({ error: "Reorder not found" }, { status: 404 });
      }
      const pv = reqRow as { quantity_requested: number };
      const { data: vrow } = await supabase
        .from("product_variants")
        .select("sku, products(name)")
        .eq("id", (reqRow as { variant_id: string }).variant_id)
        .maybeSingle();
      const vr = vrow as { sku: string; products?: { name: string } | { name: string }[] } | null;
      const pname = vr?.products
        ? Array.isArray(vr.products)
          ? vr.products[0]?.name
          : vr.products.name
        : "";
      const label = [pname, vr?.sku].filter(Boolean).join(" · ") || "SKU";

      const { error: insErr } = await supabase.from("expenses").insert({
        category: "inventory_restock",
        item_name: `Restock: ${label} ×${pv.quantity_requested}`,
        quantity: pv.quantity_requested,
        cost: total_cost,
        expense_date: getGymToday(),
        created_by_staff_id: staffId,
        reorder_request_id: reorder_id,
        notes: body.notes ? String(body.notes) : null,
      });
      if (insErr) throw insErr;
      await supabase
        .from("inventory_reorder_requests")
        .update({
          status: "ordered",
          resolved_at: new Date().toISOString(),
          resolved_by_staff_id: staffId,
        })
        .eq("id", reorder_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "snapshot") {
      const month_key = String(body.month_key || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month_key)) {
        return NextResponse.json({ error: "month_key YYYY-MM required" }, { status: 400 });
      }
      const revenue = Number(body.revenue);
      const costs_total = Number(body.costs_total);
      const profit = Number(body.profit);
      if (![revenue, costs_total, profit].every((n) => Number.isFinite(n))) {
        return NextResponse.json({ error: "revenue, costs_total, profit required" }, { status: 400 });
      }
      const { error } = await supabase.from("finance_monthly_snapshots").upsert(
        {
          month_key,
          revenue,
          costs_total,
          profit,
          payroll_total: body.payroll_total != null ? Number(body.payroll_total) : null,
          rent_amount: body.rent_amount != null ? Number(body.rent_amount) : null,
          expenses_total: body.expenses_total != null ? Number(body.expenses_total) : null,
          notes: body.notes ? String(body.notes) : null,
          recorded_by_staff_id: staffId,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "month_key" }
      );
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("finance POST", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
