import { getGymDateFromISO, getGymStartOfDay, getGymToday } from "@/lib/gymTimezone";

/** YYYY-MM-DD → MM-DD (ignore year). */
function monthDay(ymd: string): string | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[2]}-${m[3]}`;
}

function addDaysFromGymYmd(ymd: string, days: number): string {
  const start = new Date(getGymStartOfDay(ymd)).getTime();
  return getGymDateFromISO(new Date(start + days * 86400000).toISOString());
}

export interface MemberBirthdayRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  birthday_message_sent_year: number | null;
}

export interface UpcomingBirthday extends MemberBirthdayRow {
  nextOccurrenceYmd: string;
  daysFromToday: number;
}

/**
 * Members whose birthday (month/day) falls within the next `horizonDays` gym-calendar days starting today.
 */
export function filterUpcomingBirthdays(members: MemberBirthdayRow[], horizonDays: number): UpcomingBirthday[] {
  const today = getGymToday();
  const horizon = Math.min(366, Math.max(1, horizonDays));
  const out: UpcomingBirthday[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < horizon; i++) {
    const d = addDaysFromGymYmd(today, i);
    const md = monthDay(d);
    if (!md) continue;
    for (const m of members) {
      if (!m.date_of_birth) continue;
      const bmd = monthDay(m.date_of_birth);
      if (bmd !== md) continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({
        ...m,
        nextOccurrenceYmd: d,
        daysFromToday: i,
      });
    }
  }
  out.sort((a, b) => a.daysFromToday - b.daysFromToday || (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  return out;
}
