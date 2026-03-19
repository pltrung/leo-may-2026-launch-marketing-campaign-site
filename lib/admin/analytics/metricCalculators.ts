import type { MetricBasis } from "./metricDefinitions";

/** Payload shape returned by GET /api/admin/finance (subset). */
export type FinanceMetricsPayload = {
  revenue_mtd?: number;
  refunds_mtd?: number;
  cash_sales_mtd?: number;
  cash_out_mtd?: number | null;
  net_cash_flow_mtd?: number | null;
  eom_net_cash_flow_forecast?: number | null;
  monthly_costs?: number;
  profit?: number;
  payroll_total?: number;
  rent_amount?: number;
  expenses_mtd?: number;
  runway_months?: number | null;
  runway_display?: "months" | "cash_positive" | "unknown";
  config?: { current_cash?: number };
  payroll_record?: { status?: string } | null;
};

export function basisForFinance(): MetricBasis {
  return "mixed";
}

export function cashInBank(f: FinanceMetricsPayload | null): number | null {
  const c = f?.config?.current_cash;
  if (c == null || !Number.isFinite(c)) return null;
  return c;
}

export function formatRunway(
  f: FinanceMetricsPayload | null,
  t: (en: string, vi: string) => string
): string {
  if (!f) return "—";
  if (f.runway_display === "cash_positive") return t("Cash positive", "Dương quỹ");
  if (f.runway_months != null && f.runway_months > 0) return `${f.runway_months} ${t("mo", "tháng")}`;
  return "—";
}

/** EOM cash-oriented forecast: extrapolate revenue, compare to full-month cost estimate from finance.profit path — simplified. */
export function eomNetCashFlowForecast(
  revenueMtd: number,
  dayOfMonth: number,
  daysInMonth: number,
  monthlyCostsEstimate: number
): number | null {
  if (dayOfMonth <= 0 || daysInMonth <= 0) return null;
  const revEom = (revenueMtd / dayOfMonth) * daysInMonth;
  return Math.round(revEom - monthlyCostsEstimate);
}
