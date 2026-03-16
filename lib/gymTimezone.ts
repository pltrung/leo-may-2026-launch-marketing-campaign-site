/**
 * Gym timezone: America/Los_Angeles (PDT/PST).
 * All "today", day boundaries, and date-based queries for /gym, /staff, /dashboard, /admin
 * use this timezone so staff checked-in counts, revenue, check-ins, and sessions align.
 */

const GYM_TZ = "America/Los_Angeles";

/**
 * Current date in gym TZ as YYYY-MM-DD.
 */
export function getGymToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA gives YYYY-MM-DD
}

/**
 * Date (YYYY-MM-DD) in gym TZ for a given ISO timestamp (e.g. check-in time).
 */
export function getGymDateFromISO(iso: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(iso));
}

/**
 * Start of a calendar day in gym TZ as ISO string (for DB comparisons).
 * @param dateStr YYYY-MM-DD in gym TZ; defaults to today.
 */
export function getGymStartOfDay(dateStr?: string): string {
  const d = dateStr ?? getGymToday();
  const [y, m, day] = d.split("-").map(Number);
  const noonUTC = new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
  const laHour = parseInt(
    noonUTC.toLocaleString("en-US", { timeZone: GYM_TZ, hour: "numeric", hour12: false }),
    10
  );
  const laMin = parseInt(
    noonUTC.toLocaleString("en-US", { timeZone: GYM_TZ, minute: "numeric" }),
    10
  );
  const msToMidnight = (laHour * 60 + laMin) * 60 * 1000;
  return new Date(noonUTC.getTime() - msToMidnight).toISOString();
}

/**
 * End of a calendar day in gym TZ as ISO string (23:59:59.999).
 */
export function getGymEndOfDay(dateStr?: string): string {
  const start = new Date(getGymStartOfDay(dateStr)).getTime();
  return new Date(start + 86400000 - 1).toISOString();
}

/**
 * Start of current week (Monday 00:00) in gym TZ as ISO.
 */
export function getGymStartOfWeek(): string {
  const today = getGymToday();
  const startOfToday = new Date(getGymStartOfDay(today)).getTime();
  const dayOfWeek = new Date(getGymStartOfDay(today)).toLocaleString("en-US", {
    timeZone: GYM_TZ,
    weekday: "short",
  });
  const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const daysBack = dayMap[dayOfWeek] ?? 0;
  return new Date(startOfToday - daysBack * 86400000).toISOString();
}

/**
 * Start of current month (1st 00:00) in gym TZ as ISO.
 */
export function getGymStartOfMonth(): string {
  const today = getGymToday();
  const [y, m] = today.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  return getGymStartOfDay(first);
}

/**
 * Month boundaries in gym TZ as YYYY-MM-DD.
 */
export function getGymMonthBoundaries(year?: number, month?: number): { start: string; end: string } {
  const today = getGymToday();
  const [ty, tm] = today.split("-").map(Number);
  const y = year ?? ty;
  const m = month ?? tm;
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // month 1-12, JS uses 0-indexed so m is correct
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Week boundaries (Monday–Sunday) as YYYY-MM-DD. When year/week provided, uses ISO week.
 * Otherwise returns current week in gym TZ.
 */
export function getGymWeekBoundaries(year?: number, week?: number): { start: string; end: string } {
  if (year !== undefined && week !== undefined && !isNaN(year) && !isNaN(week)) {
    const d = new Date(Date.UTC(year, 0, 1));
    const firstMonday = d.getUTCDay() === 0 ? 2 : d.getUTCDay() === 1 ? 1 : 9 - d.getUTCDay();
    d.setUTCDate(firstMonday + (week - 1) * 7);
    const start = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 6);
    const end = d.toISOString().slice(0, 10);
    return { start, end };
  }
  const gymStartWeek = getGymStartOfWeek();
  const startDate = new Date(gymStartWeek);
  const start = startDate.toISOString().slice(0, 10);
  const endDate = new Date(startDate.getTime() + 6 * 86400000);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Given a date (YYYY-MM-DD) and time (HH:MM or HH:MM:SS) in gym TZ, return ISO string.
 * Used for coaching session slots (e.g. 09:00, 09:30 in LA).
 */
export function parseGymDateTime(dateStr: string, timeHHMM: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm, ss = 0] = timeHHMM.split(/[:]/).map(Number);
  const noonUTC = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const laHour = parseInt(
    noonUTC.toLocaleString("en-US", { timeZone: GYM_TZ, hour: "numeric", hour12: false }),
    10
  );
  const laMin = parseInt(
    noonUTC.toLocaleString("en-US", { timeZone: GYM_TZ, minute: "numeric" }),
    10
  );
  const offsetMs = (laHour * 60 + laMin) * 60 * 1000;
  const midnightLA = noonUTC.getTime() - offsetMs;
  const slotMs = (hh * 60 + mm) * 60 * 1000 + ss * 1000;
  return new Date(midnightLA + slotMs).toISOString();
}
