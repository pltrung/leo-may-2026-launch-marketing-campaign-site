/**
 * Broad marketing audiences (blank templates) — all / active / inactive / visitors / never visited.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const MARKETING_AUDIENCES = [
  {
    id: "marketing_all_members",
    nameEn: "All members",
    nameVi: "Tất cả thành viên",
    descriptionEn: "Every member profile with an email (active or inactive).",
    descriptionVi: "Mọi hồ sơ có email (đang hoạt động hoặc không).",
  },
  {
    id: "marketing_active_members",
    nameEn: "Active members",
    nameVi: "Thành viên đang hoạt động",
    descriptionEn: "Valid day pass (not expired) or visit pass with visits remaining.",
    descriptionVi: "Day pass còn hạn hoặc gói lượt còn lượt.",
  },
  {
    id: "marketing_inactive_members",
    nameEn: "Inactive members",
    nameVi: "Thành viên không còn hiệu lực",
    descriptionEn: "No active pass or visits left (lapsed).",
    descriptionVi: "Không còn pass hoặc hết lượt.",
  },
  {
    id: "marketing_visitor_members",
    nameEn: "Visitor members",
    nameVi: "Đã từng tới phòng tập",
    descriptionEn: "At least one recorded check-in at the gym.",
    descriptionVi: "Đã có ít nhất một lần check-in.",
  },
  {
    id: "marketing_never_visited",
    nameEn: "Never visited",
    nameVi: "Chưa từng check-in",
    descriptionEn: "Signed up but no check-in yet.",
    descriptionVi: "Đã đăng ký nhưng chưa check-in.",
  },
] as const;

export type MarketingAudienceId = (typeof MARKETING_AUDIENCES)[number]["id"];

const AUDIENCE_IDS = new Set<string>(MARKETING_AUDIENCES.map((a) => a.id));

export function isMarketingAudienceId(id: string): id is MarketingAudienceId {
  return AUDIENCE_IDS.has(id);
}

function displayName(p: {
  display_name?: string | null;
  full_name?: string | null;
}): string {
  return (p.display_name?.trim() || p.full_name?.trim() || "there") as string;
}

export async function getMarketingAudienceRecipients(
  supabase: SupabaseClient,
  audienceId: MarketingAudienceId
): Promise<{ email: string; name: string; member_id: string }[]> {
  const now = new Date();
  const { data: profiles } = await supabase
    .from("member_profiles")
    .select("id, email, full_name, display_name, membership_expires_at, visits_remaining");
  const allProfiles = (profiles ?? []) as {
    id: string;
    email: string | null;
    full_name?: string | null;
    display_name?: string | null;
    membership_expires_at?: string | null;
    visits_remaining?: number | null;
  }[];

  const { data: checkins } = await supabase
    .from("gym_checkins")
    .select("member_id")
    .eq("counts_as_visit", true);
  const visitCount = new Map<string, number>();
  for (const c of checkins ?? []) {
    const id = (c as { member_id: string }).member_id;
    visitCount.set(id, (visitCount.get(id) ?? 0) + 1);
  }

  function hasCurrentAccess(p: (typeof allProfiles)[0]): boolean {
    const expires = p.membership_expires_at ? new Date(p.membership_expires_at).getTime() : 0;
    const visits = p.visits_remaining ?? 0;
    return expires > now.getTime() || visits > 0;
  }

  const withEmail = allProfiles.filter((p) => p.email?.trim());
  let filtered: typeof allProfiles;

  switch (audienceId) {
    case "marketing_all_members":
      filtered = withEmail;
      break;
    case "marketing_active_members":
      filtered = withEmail.filter((p) => hasCurrentAccess(p));
      break;
    case "marketing_inactive_members":
      filtered = withEmail.filter((p) => !hasCurrentAccess(p));
      break;
    case "marketing_visitor_members":
      filtered = withEmail.filter((p) => (visitCount.get(p.id) ?? 0) >= 1);
      break;
    case "marketing_never_visited":
      filtered = withEmail.filter((p) => (visitCount.get(p.id) ?? 0) === 0);
      break;
    default:
      filtered = [];
  }

  return filtered.map((p) => ({
    email: p.email!.trim(),
    name: displayName(p),
    member_id: p.id,
  }));
}
