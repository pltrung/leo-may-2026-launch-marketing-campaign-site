/**
 * Visit packs (5 / 10 / 20) are priced below buying the same number of single-day passes.
 * Marketing baseline: 1-day pass = 390,000 VND per visit.
 */
export const DAY_PASS_BASELINE_PER_VISIT_VND = 390_000;

export function visitPackVisitCount(planId: string, durationVisits?: number | null): number {
  const v = durationVisits ?? 0;
  if (v > 0) return v;
  if (planId === "visit_5") return 5;
  if (planId === "visit_10") return 10;
  if (planId === "visit_20") return 20;
  return 0;
}

export function isVisitPackPlan(planId: string, durationVisits?: number | null): boolean {
  return visitPackVisitCount(planId, durationVisits) > 0;
}

/** Savings vs buying N separate day passes at baseline price. */
export function visitPackVsDayPassBaseline(priceVnd: number, visits: number): {
  listAtDayRateVnd: number;
  discountPct: number;
  perVisitEffectiveVnd: number;
} | null {
  if (visits <= 0 || priceVnd <= 0) return null;
  const listAtDayRateVnd = visits * DAY_PASS_BASELINE_PER_VISIT_VND;
  const discountPct = Math.max(0, Math.min(99, Math.round((1 - priceVnd / listAtDayRateVnd) * 100)));
  const perVisitEffectiveVnd = Math.round(priceVnd / visits);
  return { listAtDayRateVnd, discountPct, perVisitEffectiveVnd };
}

/** Duration days that we show "vs N× day pass" for (30, 180, 365). */
const MULTI_DAY_DURATIONS = [30, 180, 365];

export function isMultiDayPass(durationDays?: number | null): boolean {
  return durationDays != null && MULTI_DAY_DURATIONS.includes(durationDays);
}

/**
 * Savings for 30/180/365 day pass vs buying (1 day pass × N).
 * Use dayPassPriceVnd from plan "day_pass" or DAY_PASS_BASELINE_PER_VISIT_VND.
 */
export function dayPassVsMultiDayBaseline(
  priceVnd: number,
  durationDays: number,
  dayPassPriceVnd: number
): { listAtDayRateVnd: number; discountPct: number } | null {
  if (!isMultiDayPass(durationDays) || dayPassPriceVnd <= 0 || priceVnd <= 0) return null;
  const listAtDayRateVnd = durationDays * dayPassPriceVnd;
  if (priceVnd >= listAtDayRateVnd) return null;
  const discountPct = Math.max(1, Math.min(99, Math.round((1 - priceVnd / listAtDayRateVnd) * 100)));
  return { listAtDayRateVnd, discountPct };
}
