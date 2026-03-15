/**
 * Achievement evaluation and grant logic.
 * Used after check-in: evaluate which achievements the member now qualifies for and grant them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AchievementRow = {
  id: string;
  code: string;
  requirement_type: string;
  requirement_value: number | null;
  requirement_meta: unknown;
};

export type MemberStats = {
  totalVisits: number;
  currentStreak: number;
  checkinTimestamp: string; // ISO string of the check-in that just happened
};

/**
 * Returns true if the member qualifies for this achievement given current stats and the check-in that just occurred.
 */
export function qualifiesForAchievement(
  achievement: AchievementRow,
  stats: MemberStats,
  alreadyEarnedCodes: Set<string>
): boolean {
  if (alreadyEarnedCodes.has(achievement.code)) return false;

  const { requirement_type, requirement_value } = achievement;
  const value = requirement_value ?? 0;
  const d = new Date(stats.checkinTimestamp);
  const hour = d.getUTCHours();
  const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday

  switch (requirement_type) {
    case "total_visits":
      return stats.totalVisits >= value;
    case "streak_days":
      return stats.currentStreak >= value;
    case "checkin_hour_min":
      // Check-in at or after this hour (e.g. 18 = 6 PM)
      return hour >= value;
    case "checkin_hour_max":
      // Check-in at or before this hour (e.g. 10 = before 10 AM)
      return hour < value;
    case "checkin_weekend":
      return day === 0 || day === 6;
    default:
      return false;
  }
}

/**
 * Update member_profiles streak columns from the new check-in timestamp and previous state.
 * Returns the new current_streak and new best_streak.
 */
export function computeStreakUpdate(
  lastCheckinDate: string | null,
  currentStreak: number,
  bestStreak: number,
  newCheckinTimestamp: string
): { newCurrentStreak: number; newBestStreak: number; newLastCheckinDate: string } {
  const newDate = new Date(newCheckinTimestamp);
  const today = new Date(Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate())).toISOString().slice(0, 10);

  if (!lastCheckinDate) {
    return { newCurrentStreak: 1, newBestStreak: Math.max(1, bestStreak), newLastCheckinDate: today };
  }

  const yesterday = new Date(newDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newCurrent = currentStreak;
  if (lastCheckinDate === today) {
    // Same-day check-in: streak unchanged
    newCurrent = currentStreak;
  } else if (lastCheckinDate === yesterdayStr) {
    newCurrent = currentStreak + 1;
  } else {
    newCurrent = 1;
  }

  const newBest = Math.max(newCurrent, bestStreak);
  return { newCurrentStreak: newCurrent, newBestStreak: newBest, newLastCheckinDate: today };
}

/**
 * Evaluate all achievements for the member and insert newly earned ones.
 * Returns the list of achievement codes that were newly granted.
 */
export async function evaluateAndGrantAchievements(
  supabase: SupabaseClient,
  memberId: string,
  stats: MemberStats
): Promise<string[]> {
  const { data: achievements, error: achErr } = await supabase
    .from("achievements")
    .select("id, code, requirement_type, requirement_value, requirement_meta");

  if (achErr || !achievements?.length) return [];

  const { data: earned } = await supabase
    .from("member_achievements")
    .select("achievements(code)")
    .eq("member_id", memberId);

  const earnedCodes = new Set<string>();
  for (const row of earned ?? []) {
    const code = (row as { achievements?: { code?: string } } | null)?.achievements?.code;
    if (code) earnedCodes.add(code);
  }

  const toGrant = achievements.filter((a) =>
    qualifiesForAchievement(a as AchievementRow, stats, earnedCodes)
  );

  const granted: string[] = [];
  for (const a of toGrant) {
    const { error } = await supabase.from("member_achievements").insert({
      member_id: memberId,
      achievement_id: a.id,
    });
    if (!error) granted.push(a.code);
  }
  return granted;
}
