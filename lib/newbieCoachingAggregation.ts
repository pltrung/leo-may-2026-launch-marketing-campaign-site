/** Roles allowed to be auto-assigned as newbie-class coach (wall / coaching staff, not front desk or kiosk). */
export const NEWBIE_COACH_AUTO_ASSIGN_ROLES = ["route_setter", "coach", "admin"] as const;

export type NewbieCoachEligibleRole = (typeof NEWBIE_COACH_AUTO_ASSIGN_ROLES)[number];

export function isEligibleNewbieCoachRole(role: string | null | undefined): role is NewbieCoachEligibleRole {
  return NEWBIE_COACH_AUTO_ASSIGN_ROLES.includes(role as NewbieCoachEligibleRole);
}

const MAX_NEWBIES_PER_COACHING_SLOT = 5;

export type CoachingSessionRow = {
  id: string;
  start_time: string;
  end_time?: string;
  coach_id: string | null;
  session_type?: string;
  status?: string;
  location?: string | null;
  staff_profiles?: unknown;
};

/** Merge rows that share the same slot (same start_time + location) so UI shows one row + total newbies. */
export function aggregateNewbieSessionsBySlot(
  sessions: CoachingSessionRow[],
  newbieCountBySession: Record<string, number>
): Array<
  CoachingSessionRow & {
    newbie_count: number;
    session_ids: string[];
    max_newbies: number;
  }
> {
  const map = new Map<
    string,
    CoachingSessionRow & { newbie_count: number; session_ids: string[]; max_newbies: number }
  >();
  for (const s of sessions) {
    const n = newbieCountBySession[s.id] ?? 0;
    if (n <= 0) continue;
    const loc = (s.location as string) ?? "Main Wall - Beginner Area";
    const key = `${s.start_time}\0${loc}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        ...s,
        location: loc,
        newbie_count: n,
        session_ids: [s.id],
        max_newbies: MAX_NEWBIES_PER_COACHING_SLOT,
      });
    } else {
      prev.newbie_count += n;
      prev.session_ids.push(s.id);
      if (!prev.coach_id && s.coach_id) {
        prev.coach_id = s.coach_id;
        prev.staff_profiles = s.staff_profiles;
        prev.id = s.id;
        prev.end_time = s.end_time ?? prev.end_time;
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}
