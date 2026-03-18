/**
 * Membership / revenue / profit projection for admin Forecast tab.
 * Extend later for charts, multi-scenario comparison.
 */

export type ForecastMonthRow = {
  monthIndex: number;
  monthKey: string;
  monthLabel: string;
  members: number;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeProfit: number;
};

function addCalendarMonths(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

/**
 * For each month: members = members * retention + new_members; revenue = members * avg_price; profit = revenue - costs.
 */
export function forecastMonths(
  startMembers: number,
  months: number,
  retentionRate: number,
  newPerMonth: number,
  avgMemberPrice: number,
  monthlyCosts: number,
  locale: "en" | "vi" = "en"
): ForecastMonthRow[] {
  let members = Math.max(0, startMembers);
  const r = Math.min(1, Math.max(0, retentionRate));
  const rows: ForecastMonthRow[] = [];
  let cumulative = 0;
  const base = new Date();
  const y0 = base.getFullYear();
  const m0 = base.getMonth() + 1;

  for (let i = 1; i <= months; i++) {
    members = members * r + newPerMonth;
    const membersRounded = Math.round(members);
    const revenue = membersRounded * avgMemberPrice;
    const profit = revenue - monthlyCosts;
    cumulative += profit;
    const { y, m } = addCalendarMonths(y0, m0, i);
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const monthLabel =
      locale === "vi"
        ? `T${m}/${y}`
        : new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    rows.push({
      monthIndex: i,
      monthKey,
      monthLabel,
      members: membersRounded,
      revenue,
      costs: monthlyCosts,
      profit,
      cumulativeProfit: cumulative,
    });
  }
  return rows;
}

/** Month-1 projected members after one step from start. */
export function nextMonthMembers(
  startMembers: number,
  retentionRate: number,
  newPerMonth: number
): number {
  const m = Math.max(0, startMembers) * Math.min(1, Math.max(0, retentionRate)) + newPerMonth;
  return Math.round(m);
}

/** Runway in months from current cash using first-month projected net (revenue − costs). */
export function runwayFromFirstMonth(
  currentCash: number,
  startMembers: number,
  retentionRate: number,
  newPerMonth: number,
  avgMemberPrice: number,
  monthlyCosts: number
): { months: number | null; infinite: boolean; monthlyNet: number; m1Revenue: number } {
  const m1 = nextMonthMembers(startMembers, retentionRate, newPerMonth);
  const m1Revenue = m1 * avgMemberPrice;
  const monthlyNet = m1Revenue - monthlyCosts;
  if (monthlyNet >= 0) {
    return { months: null, infinite: true, monthlyNet, m1Revenue };
  }
  const burn = Math.abs(monthlyNet);
  if (burn <= 0) return { months: null, infinite: true, monthlyNet, m1Revenue };
  return {
    months: currentCash / burn,
    infinite: false,
    monthlyNet,
    m1Revenue,
  };
}

/** First month label where monthly profit >= 0, or null. */
export function breakEvenMonthLabel(rows: ForecastMonthRow[]): string | null {
  const row = rows.find((r) => r.profit >= 0);
  return row ? row.monthLabel : null;
}
