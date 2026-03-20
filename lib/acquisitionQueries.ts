/**
 * Acquisition analytics: helpers for funnel, attribution, and package conversion.
 * Joins marketing_attribution, ad_campaign_daily_stats, member_profiles, payments, gym_checkins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";

/** Package grouping for conversion reporting. */
export const PACKAGE_GROUPS: Record<string, { planIds: string[]; labelEn: string; labelVi: string }> = {
  newbie: { planIds: ["newbie_class"], labelEn: "First timer / Newbie class", labelVi: "Lần đầu / Newbie" },
  day_pass: { planIds: ["day_pass"], labelEn: "Day pass", labelVi: "Vé ngày" },
  visit_pack: { planIds: ["visit_5", "visit_10", "visit_20"], labelEn: "Visit pack", labelVi: "Gói lượt" },
  monthly: { planIds: ["month_pass"], labelEn: "Monthly", labelVi: "Tháng" },
  half_year: { planIds: ["half_year_pass"], labelEn: "180-day", labelVi: "6 tháng" },
  yearly: { planIds: ["year_pass", "explorer_year"], labelEn: "365-day", labelVi: "1 năm" },
  other: { planIds: [], labelEn: "Other", labelVi: "Khác" },
};

export function planToPackageGroup(planId: string): string {
  for (const [key, cfg] of Object.entries(PACKAGE_GROUPS)) {
    if (key === "other") continue;
    if (cfg.planIds.includes(planId)) return key;
  }
  return "other";
}

export interface AcquisitionFilters {
  since: string;
  until: string;
  channel?: string;
  campaign?: string;
  landingPath?: string;
}

/** Members with first_touch_at in range (attribution window). For funnel we count signups/purchases/check-ins in range, attributed by first touch. */
export async function getAttributedMemberIds(
  supabase: SupabaseClient,
  filters: AcquisitionFilters
): Promise<Set<string>> {
  const { data } = await supabase
    .from("marketing_attribution")
    .select("user_id")
    .not("user_id", "is", null)
    .gte("first_touch_at", filters.since)
    .lte("first_touch_at", filters.until);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const uid = (row as { user_id: string | null }).user_id;
    if (uid) ids.add(uid);
  }
  return ids;
}

/** First check-in per member: (member_id, first_checkin_at). */
export async function getFirstCheckins(
  supabase: SupabaseClient,
  since: string,
  until: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("gym_checkins")
    .select("member_id, timestamp")
    .gte("timestamp", since)
    .lte("timestamp", until)
    .order("timestamp", { ascending: true });

  const firstByMember = new Map<string, string>();
  for (const row of (data ?? []) as { member_id: string; timestamp: string }[]) {
    if (!firstByMember.has(row.member_id)) firstByMember.set(row.member_id, row.timestamp);
  }
  return firstByMember;
}
