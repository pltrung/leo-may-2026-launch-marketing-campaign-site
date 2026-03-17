/**
 * Email campaign segments for Analytics Action Panel.
 * Each segment has a key, display labels, template (subject/body), and CTA.
 * Recipient resolution is done in API using Supabase (see getSegmentRecipients).
 */

export type CampaignSegmentId =
  | "inactive_members_30d"
  | "visit_pass_users"
  | "highly_active_users"
  | "first_time_no_return"
  | "near_conversion_users"
  | "dropped_active_users"
  | "new_members_recent";

export interface CampaignSegmentDefinition {
  id: CampaignSegmentId;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  descriptionVi: string;
  ctaEn: string;
  ctaVi: string;
  subject: string;
  body: string;
}

export const CAMPAIGN_SEGMENTS: CampaignSegmentDefinition[] = [
  {
    id: "inactive_members_30d",
    nameEn: "Inactive members (30+ days)",
    nameVi: "Thành viên không hoạt động (30+ ngày)",
    descriptionEn: "No visit in the last 30 days",
    descriptionVi: "Không có lượt tới trong 30 ngày qua",
    ctaEn: "Send Reactivation Email",
    ctaVi: "Gửi email kích hoạt lại",
    subject: "We miss you at Leo Mây ☁️ Come climb again",
    body: `Hey [Name],

It's been a while since we last saw you at Leo Mây.

We'd love to have you back — your next climb might be the one that clicks.

Come by this week and we'll make sure you feel right at home again.

See you soon,
Leo Mây Team`,
  },
  {
    id: "visit_pass_users",
    nameEn: "Visit pass users",
    nameVi: "Người dùng gói lượt",
    descriptionEn: "Currently on a visit pass (5/10/20)",
    descriptionVi: "Đang dùng gói lượt (5/10/20)",
    ctaEn: "Send Upgrade Offer",
    ctaVi: "Gửi ưu đãi nâng cấp",
    subject: "You've climbed — now make it yours",
    body: `Hey [Name],

Looks like you've already experienced Leo Mây.

If you're planning to come back, a membership might make a lot more sense — better value and full access to the community.

Let us know next time you're in — we'll help you get set up.

Leo Mây Team`,
  },
  {
    id: "highly_active_users",
    nameEn: "Highly active users",
    nameVi: "Người rất tích cực",
    descriptionEn: "3+ visits per week",
    descriptionVi: "3+ lượt mỗi tuần",
    ctaEn: "Send VIP Upgrade",
    ctaVi: "Gửi nâng cấp VIP",
    subject: "You're part of Leo Mây — let's level it up",
    body: `Hey [Name],

You've been climbing a lot — we love seeing that.

If you're coming in regularly, our longer-term memberships will give you the best value.

Happy to walk you through options next time you're in.

Keep climbing,
Leo Mây Team`,
  },
  {
    id: "first_time_no_return",
    nameEn: "First-time, no return",
    nameVi: "Lần đầu chưa quay lại",
    descriptionEn: "One visit only, more than 7 days ago",
    descriptionVi: "Chỉ 1 lượt, đã qua 7 ngày",
    ctaEn: "Send Comeback Email",
    ctaVi: "Gửi email mời quay lại",
    subject: "Your second climb is where it clicks",
    body: `Hey [Name],

Your first climb is just the beginning.

Most people find that things really start to click on their second visit.

Come back and we'll guide you through your next climb.

You've got this,
Leo Mây Team`,
  },
  {
    id: "near_conversion_users",
    nameEn: "Near conversion",
    nameVi: "Sắp chuyển đổi",
    descriptionEn: "3+ visits, no membership yet",
    descriptionVi: "3+ lượt, chưa có gói thành viên",
    ctaEn: "Send Conversion Push",
    ctaVi: "Gửi thúc đẩy chuyển đổi",
    subject: "You're closer than you think",
    body: `Hey [Name],

You've already spent some time at Leo Mây — you're basically part of the community.

If you're planning to keep climbing, membership will give you the best experience and value.

Let us know next time you're in — we'll set you up.

Leo Mây Team`,
  },
  {
    id: "dropped_active_users",
    nameEn: "Dropped active users",
    nameVi: "Từng tích cực, giờ không tới",
    descriptionEn: "Active 30–60 days ago, inactive in last 30 days",
    descriptionVi: "Hoạt động 30–60 ngày trước, không tới 30 ngày qua",
    ctaEn: "Send Win-back Email",
    ctaVi: "Gửi email win-back",
    subject: "We've saved your spot ☁️",
    body: `Hey [Name],

We noticed you haven't been around lately — and we miss having you here.

There are new routes and new challenges waiting for you.

Come back soon — your wall is still here.

Leo Mây Team`,
  },
  {
    id: "new_members_recent",
    nameEn: "New members (last 3 days)",
    nameVi: "Thành viên mới (3 ngày qua)",
    descriptionEn: "Signed up in the last 3 days",
    descriptionVi: "Đăng ký trong 3 ngày qua",
    ctaEn: "Send Follow-up Email",
    ctaVi: "Gửi email theo dõi",
    subject: "How was your first climb?",
    body: `Hey [Name],

Welcome to Leo Mây.

We hope your first experience was great.

If you have any questions or want tips on what to try next, we're always here to help.

See you again soon,
Leo Mây Team`,
  },
];

export function getSegmentById(id: CampaignSegmentId): CampaignSegmentDefinition | undefined {
  return CAMPAIGN_SEGMENTS.find((s) => s.id === id);
}

/** Replace [Name] with display name or full_name fallback */
export function renderBody(body: string, name: string): string {
  const displayName = name?.trim() || "there";
  return body.replace(/\[Name\]/g, displayName);
}

/** Convert plain text body to simple HTML for Gmail */
export function bodyToHtml(body: string): string {
  return `<div style="font-family: sans-serif; line-height: 1.5; color: #334155;">${body
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 1em 0;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;
}
