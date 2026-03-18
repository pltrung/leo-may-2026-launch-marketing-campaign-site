/**
 * Visit-milestone rewards: 10→1 guest code, 25→5 codes, 50 cap / 100 shirt / 250 shoes (merch via admin).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  let s = "LEO-G-";
  for (let i = 0; i < 8; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function insertUniqueCode(
  supabase: SupabaseClient,
  ownerMemberId: string,
  milestoneVisits: 10 | 25
): Promise<void> {
  for (let t = 0; t < 30; t++) {
    const code = genCode();
    const { error } = await supabase.from("milestone_guest_pass_codes").insert({
      code,
      owner_member_id: ownerMemberId,
      milestone_visits: milestoneVisits,
    });
    if (!error) return;
    if (!String(error.message).includes("duplicate") && !String(error.code).includes("23505")) {
      console.error("milestone_guest_pass_codes insert", error);
      return;
    }
  }
}

/** Call after check-in when totalVisits is known (server-side). */
export async function syncClimbingMilestoneRewards(
  supabase: SupabaseClient,
  memberId: string,
  totalVisits: number
): Promise<void> {
  if (totalVisits >= 10) {
    let { count } = await supabase
      .from("milestone_guest_pass_codes")
      .select("id", { count: "exact", head: true })
      .eq("owner_member_id", memberId)
      .eq("milestone_visits", 10);
    let n = count ?? 0;
    while (n < 1) {
      await insertUniqueCode(supabase, memberId, 10);
      n++;
    }
  }
  if (totalVisits >= 25) {
    let { count } = await supabase
      .from("milestone_guest_pass_codes")
      .select("id", { count: "exact", head: true })
      .eq("owner_member_id", memberId)
      .eq("milestone_visits", 25);
    let n = count ?? 0;
    while (n < 5) {
      await insertUniqueCode(supabase, memberId, 25);
      n++;
    }
  }

  const merch: { visits: 50 | 100 | 250; item: "cap" | "shirt" | "shoes" }[] = [
    { visits: 50, item: "cap" },
    { visits: 100, item: "shirt" },
    { visits: 250, item: "shoes" },
  ];
  for (const m of merch) {
    if (totalVisits < m.visits) continue;
    const { data: ex } = await supabase
      .from("member_climbing_merch_rewards")
      .select("id")
      .eq("member_id", memberId)
      .eq("milestone_visits", m.visits)
      .maybeSingle();
    if (!ex) {
      await supabase.from("member_climbing_merch_rewards").insert({
        member_id: memberId,
        milestone_visits: m.visits,
        item: m.item,
      });
    }
  }
}
