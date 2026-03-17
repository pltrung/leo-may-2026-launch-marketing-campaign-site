/**
 * Resolve campaign segment to list of recipients (email + name).
 * Used by GET /api/admin/campaigns/segments (counts) and POST /api/admin/campaigns/send (emails).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignSegmentId } from "./campaignSegments";

export interface SegmentRecipient {
  id: string;
  email: string | null;
  full_name?: string | null;
  display_name?: string | null;
  created_at?: string;
}

function displayName(rec: SegmentRecipient): string {
  return (rec.display_name?.trim() || rec.full_name?.trim() || "there") as string;
}

/** Returns recipients for the given segment. Only includes members with a non-empty email. */
export async function getSegmentRecipients(
  supabase: SupabaseClient,
  segmentId: CampaignSegmentId
): Promise<{ email: string; name: string }[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles } = await supabase
    .from("member_profiles")
    .select("id, email, full_name, display_name, created_at");
  const allProfiles = (profiles ?? []) as (SegmentRecipient & { created_at: string })[];
  const byId = new Map(allProfiles.map((p) => [p.id, p]));

  const { data: checkins } = await supabase
    .from("gym_checkins")
    .select("member_id, timestamp");
  const allCheckins = (checkins ?? []) as { member_id: string; timestamp: string }[];

  const { data: payments } = await supabase
    .from("payments")
    .select("member_id, plan_id, created_at")
    .eq("status", "success");
  const allPayments = (payments ?? []) as { member_id: string; plan_id: string; created_at: string }[];

  // Last visit per member
  const lastVisitByMember = new Map<string, string>();
  for (const c of allCheckins) {
    const ex = lastVisitByMember.get(c.member_id);
    if (!ex || c.timestamp > ex) lastVisitByMember.set(c.member_id, c.timestamp);
  }
  // Total visits per member
  const totalVisitsByMember = new Map<string, number>();
  for (const c of allCheckins) {
    totalVisitsByMember.set(c.member_id, (totalVisitsByMember.get(c.member_id) ?? 0) + 1);
  }
  // Visits in last 4 weeks
  const visitsLast4Weeks = new Map<string, number>();
  for (const c of allCheckins) {
    if (c.timestamp >= fourWeeksAgo)
      visitsLast4Weeks.set(c.member_id, (visitsLast4Weeks.get(c.member_id) ?? 0) + 1);
  }
  // Latest plan per member (most recent payment by created_at)
  const latestPlanByMember2 = new Map<string, string>();
  const uniqueMemberIds = Array.from(new Set(allPayments.map((p) => p.member_id)));
  for (let i = 0; i < uniqueMemberIds.length; i++) {
    const mid = uniqueMemberIds[i];
    const plans = allPayments.filter((p) => p.member_id === mid).sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (plans[0]) latestPlanByMember2.set(mid, plans[0].plan_id);
  }

  const membershipPlans = new Set(["month_pass", "year_pass", "explorer_month", "explorer_year", "until_end_of_year"]);
  const visitPassPlans = new Set(["visit_5", "visit_10", "visit_20"]);

  let memberIds: string[] = [];

  switch (segmentId) {
    case "inactive_members_30d": {
      // last_visit_at < now - 30 days (and has at least one visit ever)
      memberIds = allProfiles
        .filter((p) => {
          const last = lastVisitByMember.get(p.id);
          return last && last < thirtyDaysAgo;
        })
        .map((p) => p.id);
      break;
    }
    case "visit_pass_users": {
      // Latest plan is visit_5, visit_10, or visit_20
      memberIds = allProfiles.filter((p) => {
        const plan = latestPlanByMember2.get(p.id);
        return plan && visitPassPlans.has(plan);
      }).map((p) => p.id);
      break;
    }
    case "highly_active_users": {
      // visits per week >= 3 in last 4 weeks
      memberIds = allProfiles.filter((p) => {
        const visits = visitsLast4Weeks.get(p.id) ?? 0;
        return visits >= 12; // 3 per week * 4 weeks
      }).map((p) => p.id);
      break;
    }
    case "first_time_no_return": {
      // total_visits === 1 and last visit > 7 days ago
      memberIds = allProfiles.filter((p) => {
        const total = totalVisitsByMember.get(p.id) ?? 0;
        const last = lastVisitByMember.get(p.id);
        return total === 1 && last && last < sevenDaysAgo;
      }).map((p) => p.id);
      break;
    }
    case "near_conversion_users": {
      // total_visits >= 3 and no membership plan
      memberIds = allProfiles.filter((p) => {
        const total = totalVisitsByMember.get(p.id) ?? 0;
        const plan = latestPlanByMember2.get(p.id);
        const hasMembership = plan && membershipPlans.has(plan);
        return total >= 3 && !hasMembership;
      }).map((p) => p.id);
      break;
    }
    case "dropped_active_users": {
      // Had visit(s) between 60-30 days ago, zero visits in last 30 days
      const hadVisit30to60 = new Set<string>();
      const hadVisitLast30 = new Set<string>();
      for (const c of allCheckins) {
        if (c.timestamp >= thirtyDaysAgo && c.timestamp <= nowIso) hadVisitLast30.add(c.member_id);
        if (c.timestamp >= sixtyDaysAgo && c.timestamp < thirtyDaysAgo) hadVisit30to60.add(c.member_id);
      }
      memberIds = allProfiles.filter((p) => hadVisit30to60.has(p.id) && !hadVisitLast30.has(p.id)).map((p) => p.id);
      break;
    }
    case "new_members_recent": {
      // created_at within last 3 days
      memberIds = allProfiles.filter((p) => p.created_at >= threeDaysAgo).map((p) => p.id);
      break;
    }
    default:
      return [];
  }

  const result: { email: string; name: string }[] = [];
  for (const id of memberIds) {
    const p = byId.get(id);
    if (!p?.email?.trim()) continue;
    result.push({ email: p.email.trim(), name: displayName(p) });
  }
  return result;
}
