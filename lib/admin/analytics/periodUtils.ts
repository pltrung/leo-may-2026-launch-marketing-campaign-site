/**
 * CEO time-horizon layer: WTD / MTD / QTD / YTD.
 * Same KPI formulas across multiple horizons; period drives date range only.
 */

import {
  getGymToday,
  getGymStartOfDay,
  getGymEndOfDay,
  getGymStartOfWeek,
  getGymStartOfMonth,
  getGymStartOfQuarter,
  getGymEndOfQuarter,
} from "@/lib/gymTimezone";

/** Monday = 1, Sunday = 0. Leo Mây default: Monday. */
export const WEEK_STARTS_ON = 1;

export type TimeHorizon = "wtd" | "mtd" | "qtd" | "ytd";

export type PeriodRange = {
  since: string;
  until: string;
  sinceDate: string;
  untilDate: string;
  horizon: TimeHorizon;
  label: string;
};

/** Start of year (Jan 1) in gym TZ. */
function getGymStartOfYear(dateStr?: string): string {
  const today = dateStr ?? getGymToday();
  const [y] = today.split("-").map(Number);
  return getGymStartOfDay(`${y}-01-01`);
}

/** End of year (Dec 31) in gym TZ. */
function getGymEndOfYear(dateStr?: string): string {
  const today = dateStr ?? getGymToday();
  const [y] = today.split("-").map(Number);
  return getGymEndOfDay(`${y}-12-31`);
}

/** WTD: start of current business week (Monday) → today. */
export function getWeekToDateRange(asOfDate?: string): PeriodRange {
  const today = asOfDate ?? getGymToday();
  const since = getGymStartOfWeek(); // uses getGymToday(); asOfDate reserved for prior-period support
  const until = getGymEndOfDay(today);
  return {
    since,
    until,
    sinceDate: since.slice(0, 10),
    untilDate: until.slice(0, 10),
    horizon: "wtd",
    label: "wtd",
  };
}

/** MTD: first day of current month → today. */
export function getMonthToDateRange(asOfDate?: string): PeriodRange {
  const today = asOfDate ?? getGymToday();
  const since = getGymStartOfMonth();
  const until = getGymEndOfDay(today);
  return {
    since,
    until,
    sinceDate: since.slice(0, 10),
    untilDate: until.slice(0, 10),
    horizon: "mtd",
    label: "mtd",
  };
}

/** QTD: first day of current quarter → today. */
export function getQuarterToDateRange(asOfDate?: string): PeriodRange {
  const today = asOfDate ?? getGymToday();
  const since = getGymStartOfQuarter();
  const until = getGymEndOfDay(today);
  return {
    since,
    until,
    sinceDate: since.slice(0, 10),
    untilDate: until.slice(0, 10),
    horizon: "qtd",
    label: "qtd",
  };
}

/** YTD: Jan 1 → today. */
export function getYearToDateRange(asOfDate?: string): PeriodRange {
  const today = asOfDate ?? getGymToday();
  const since = getGymStartOfYear(today);
  const until = getGymEndOfDay(today);
  return {
    since,
    until,
    sinceDate: since.slice(0, 10),
    untilDate: until.slice(0, 10),
    horizon: "ytd",
    label: "ytd",
  };
}

/** Single entry point: get period range for selected horizon. */
export function getPeriodRange(
  horizon: TimeHorizon,
  asOfDate?: string
): PeriodRange {
  switch (horizon) {
    case "wtd":
      return getWeekToDateRange(asOfDate);
    case "mtd":
      return getMonthToDateRange(asOfDate);
    case "qtd":
      return getQuarterToDateRange(asOfDate);
    case "ytd":
      return getYearToDateRange(asOfDate);
    default:
      return getMonthToDateRange(asOfDate);
  }
}

/** Prior-period range for future comparison (e.g. prior MTD vs current MTD). */
export function getPriorPeriodRange(
  horizon: TimeHorizon,
  asOfDate?: string
): PeriodRange | null {
  // TODO: implement prior-period logic when comparison layer is added
  return null;
}

/** Chart bucket granularity for readability. */
export function getRecommendedChartBucket(
  horizon: TimeHorizon
): "day" | "week" | "month" {
  if (horizon === "wtd" || horizon === "mtd") return "day";
  if (horizon === "qtd") return "week";
  return "month"; // ytd
}

/** Forecast suffix for labels: EOM, EOQ, EOY. */
export function getForecastSuffix(horizon: TimeHorizon): string {
  switch (horizon) {
    case "wtd":
    case "mtd":
      return "EOM"; // month-end
    case "qtd":
      return "EOQ"; // quarter-end
    case "ytd":
      return "EOY"; // year-end
    default:
      return "EOM";
  }
}

/** Human-readable horizon label (EN/VI). */
export function getHorizonLabel(
  horizon: TimeHorizon,
  locale: "en" | "vi" = "en"
): string {
  const map: Record<TimeHorizon, { en: string; vi: string }> = {
    wtd: { en: "WTD", vi: "Từ đầu tuần" },
    mtd: { en: "MTD", vi: "Từ đầu tháng" },
    qtd: { en: "QTD", vi: "Từ đầu quý" },
    ytd: { en: "YTD", vi: "Từ đầu năm" },
  };
  return locale === "vi" ? map[horizon].vi : map[horizon].en;
}

/** Short suffix for card labels: (WTD), (MTD), etc. */
export function getHorizonSuffix(horizon: TimeHorizon): string {
  return `(${horizon.toUpperCase()})`;
}
