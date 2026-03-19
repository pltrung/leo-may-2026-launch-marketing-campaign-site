/**
 * GET — forecast inputs: config, current_members, monthly_costs (from finance), suggested avg price
 * PATCH — update forecast_config (single row)
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

type StaffRow = {
  id: string;
  monthly_salary: number | null;
  commission_rate: number | null;
  compensation_type: string | null;
  hourly_rate_vnd: number | null;
};

function payrollForPeriod(
  staffList: StaffRow[],
  posRows: { staff_id: string | null; total: number; commission_amount: number | null }[],
  checkInsByStaff: Record<string, number>
): number {
  let total = 0;
  for (const s of staffList) {
    const pos = posRows.filter((p) => p.staff_id === s.id);
    const salesMtd = pos.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const actualComm = pos.reduce((sum, p) => sum + (Number(p.commission_amount) || 0), 0);
    const rate = Number(s.commission_rate) || 0;
    const variable = rate > 0 ? Math.round(salesMtd * rate) : actualComm;
    const isHourly = (s.compensation_type || "monthly") === "hourly";
    const checkIns = checkInsByStaff[s.id] ?? 0;
    const hourlyRate = Number(s.hourly_rate_vnd) || 0;
    const basePay = isHourly
      ? Math.round(checkIns * hourlyRate)
      : Number(s.monthly_salary) || 0;
    total += basePay + variable;
  }
  return total;
}

function daysInGymMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
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
  const untilIso = getGymEndOfDay(today);
  const [ty, tm, td] = today.split("-").map(Number);
  const dim = daysInGymMonth(ty, tm);
  const dayOfMonth = Math.max(td, 1);
  const extrap = dim / dayOfMonth;

  try {
    const { data: fcRows } = await supabase.from("forecast_config").select("*").limit(1);
    let fc = fcRows?.[0] as Record<string, unknown> | undefined;
    if (!fc) {
      const { data: fin } = await supabase.from("finance_config").select("current_cash").limit(1);
      const cash = Number((fin?.[0] as { current_cash?: number })?.current_cash) || 0;
      await supabase.from("forecast_config").insert({
        current_cash: cash,
        avg_member_price: 350000,
        retention_rate: 0.92,
        new_members_per_month: 8,
      });
      const { data: again } = await supabase.from("forecast_config").select("*").limit(1);
      fc = again?.[0] as Record<string, unknown>;
    }

    const { data: financeRows } = await supabase.from("finance_config").select("*").limit(1);
    const finCfg = (financeRows?.[0] as { rent_amount?: number }) ?? { rent_amount: 0 };
    const rentAmount = Number(finCfg.rent_amount) || 0;

    const { data: posRowsMtd } = await supabase
      .from("pos_transactions")
      .select("total, commission_amount, staff_id, created_at")
      .gte("created_at", monthStartIso)
      .lte("created_at", untilIso)
      .eq("payment_status", "success");

    const { data: staffListRaw } = await supabase
      .from("staff_profiles")
      .select("id, monthly_salary, commission_rate, compensation_type, hourly_rate_vnd");
    const staffList = (staffListRaw ?? []) as StaffRow[];
    const posStaff = (posRowsMtd ?? []) as {
      staff_id: string | null;
      total: number;
      commission_amount: number | null;
    }[];
    const { data: attendanceRows } = await supabase
      .from("staff_attendance")
      .select("staff_id")
      .gte("date", monthStartDate)
      .lte("date", today)
      .eq("status", "IN");
    const checkInsByStaff: Record<string, number> = {};
    for (const row of attendanceRows ?? []) {
      const sid = (row as { staff_id: string }).staff_id;
      checkInsByStaff[sid] = (checkInsByStaff[sid] ?? 0) + 1;
    }
    const payrollMtd = payrollForPeriod(staffList, posStaff, checkInsByStaff);

    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("cost")
      .gte("expense_date", monthStartDate)
      .lte("expense_date", today);
    let expensesMtd = 0;
    for (const e of expenseRows ?? []) {
      expensesMtd += Number((e as { cost: number }).cost) || 0;
    }

    const sumSalaries = staffList.reduce((s, x) => {
      const isHourly = (x.compensation_type || "monthly") === "hourly";
      const checkIns = checkInsByStaff[x.id] ?? 0;
      const hourlyRate = Number(x.hourly_rate_vnd) || 0;
      return s + (isHourly ? Math.round(checkIns * hourlyRate) : (Number(x.monthly_salary) || 0));
    }, 0);
    const variableMtd = Math.max(0, payrollMtd - sumSalaries);
    const monthly_costs = Math.round(rentAmount + sumSalaries + variableMtd * extrap + expensesMtd * extrap);

    const { data: memberRows } = await supabase
      .from("member_profiles")
      .select("id, membership_status, membership_expires_at, visits_remaining");
    const now = Date.now();
    let current_members = 0;
    for (const m of memberRows ?? []) {
      const row = m as {
        membership_status: string;
        membership_expires_at: string | null;
        visits_remaining: number | null;
      };
      const exp = row.membership_expires_at ? new Date(row.membership_expires_at).getTime() : 0;
      const activeDay =
        row.membership_status === "active" && exp > now;
      const visits = Number(row.visits_remaining) || 0;
      if (activeDay || visits > 0) current_members += 1;
    }

    const pm = tm === 1 ? 12 : tm - 1;
    const py = tm === 1 ? ty - 1 : ty;
    const { start: prevStart, end: prevEnd } = getGymMonthBoundaries(py, pm);
    const sinceP = getGymStartOfDay(prevStart);
    const untilP = getGymEndOfDay(prevEnd);
    const { data: payPrev } = await supabase
      .from("payments")
      .select("amount")
      .gte("created_at", sinceP)
      .lte("created_at", untilP)
      .eq("status", "success");
    const { data: posPrev } = await supabase
      .from("pos_transactions")
      .select("total")
      .gte("created_at", sinceP)
      .lte("created_at", untilP)
      .eq("payment_status", "success");
    let last_month_revenue = 0;
    for (const p of payPrev ?? []) last_month_revenue += Number((p as { amount: number }).amount) || 0;
    for (const r of posPrev ?? []) last_month_revenue += Number((r as { total: number }).total) || 0;

    const suggested_avg_price =
      current_members > 0 ? Math.round(last_month_revenue / current_members) : 0;

    return NextResponse.json({
      config: {
        current_cash: Number(fc?.current_cash) || 0,
        avg_member_price: Number(fc?.avg_member_price) || 0,
        retention_rate: Number(fc?.retention_rate) ?? 0.92,
        new_members_per_month: Number(fc?.new_members_per_month) || 0,
      },
      current_members,
      monthly_costs,
      last_month_revenue,
      suggested_avg_price,
      meta: {
        monthly_costs_note:
          "Rent + salaries + (MTD variable pay & expenses extrapolated to full month)",
      },
    });
  } catch (e) {
    console.error("forecast GET", e);
    return NextResponse.json({ error: "Failed to load forecast data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

  const supabase = createServerClient();
  const { data: row } = await supabase.from("forecast_config").select("id").limit(1).maybeSingle();
  const id = (row as { id?: string })?.id;
  if (!id) {
    return NextResponse.json({ error: "forecast_config missing" }, { status: 500 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.current_cash === "number" && Number.isFinite(body.current_cash)) {
    patch.current_cash = body.current_cash;
  }
  if (typeof body.avg_member_price === "number" && Number.isFinite(body.avg_member_price)) {
    patch.avg_member_price = Math.max(0, body.avg_member_price);
  }
  if (typeof body.retention_rate === "number" && Number.isFinite(body.retention_rate)) {
    patch.retention_rate = Math.min(1, Math.max(0, body.retention_rate));
  }
  if (typeof body.new_members_per_month === "number" && Number.isFinite(body.new_members_per_month)) {
    patch.new_members_per_month = Math.max(0, Math.floor(body.new_members_per_month));
  }

  const { error } = await supabase.from("forecast_config").update(patch).eq("id", id);
  if (error) {
    console.error("forecast PATCH", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
