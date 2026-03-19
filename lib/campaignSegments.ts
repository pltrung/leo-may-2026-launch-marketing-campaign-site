/**
 * Email campaign segments for Analytics Action Panel.
 * Many cohorts for targeted campaigns. Rewards: guest pass for those who already have access; free visits for lapsed / no pass.
 */

export type CampaignSegmentId =
  | "expiring_soon_7d"
  | "inactive_members_30d"
  | "visit_pass_users"
  | "highly_active_users"
  | "first_time_no_return"
  | "near_conversion_users"
  | "dropped_active_users"
  | "new_members_recent"
  | "birthday_this_week"
  | "first_visit_not_welcomed";

/** Group segments for CEO analytics: Lifecycle, Retention, Upsell/loyalty */
export const SEGMENT_GROUPS: {
  id: "lifecycle" | "retention" | "upsell";
  nameEn: string;
  nameVi: string;
  segmentIds: CampaignSegmentId[];
}[] = [
  {
    id: "lifecycle",
    nameEn: "Lifecycle",
    nameVi: "Vòng đời",
    segmentIds: ["first_visit_not_welcomed", "new_members_recent", "near_conversion_users"],
  },
  {
    id: "retention",
    nameEn: "Retention",
    nameVi: "Giữ chân",
    segmentIds: ["inactive_members_30d", "dropped_active_users", "first_time_no_return"],
  },
  {
    id: "upsell",
    nameEn: "Upsell & loyalty",
    nameVi: "Nâng cấp & trung thành",
    segmentIds: ["visit_pass_users", "highly_active_users", "birthday_this_week"],
  },
];

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
    id: "expiring_soon_7d",
    nameEn: "Expiring within 7 days",
    nameVi: "Hết hạn trong 7 ngày",
    descriptionEn: "Memberships expiring within the next 7 days",
    descriptionVi: "Gói hết hạn trong 7 ngày tới",
    ctaEn: "Send Renewal Reminder",
    ctaVi: "Gửi nhắc gia hạn",
    subject: "Your Leo Mây membership expires soon — renew to keep climbing",
    body: `Hey [Name],

Your membership is expiring soon. Don't lose access — renew now and keep your climbing momentum going.

See you on the wall,
Leo Mây Team`,
  },
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
  {
    id: "birthday_this_week",
    nameEn: "Birthday this week",
    nameVi: "Sinh nhật trong tuần",
    descriptionEn: "Birthday (month/day) in the next 7 days",
    descriptionVi: "Sinh nhật (tháng/ngày) trong 7 ngày tới",
    ctaEn: "Send birthday email",
    ctaVi: "Gửi email sinh nhật",
    subject: "Happy birthday from Leo Mây 🎂",
    body: `Hey [Name],

Happy birthday from the whole team at Leo Mây.

We hope you have a great day — and we'd love to see you on the wall soon.

Leo Mây Team`,
  },
  {
    id: "first_visit_not_welcomed",
    nameEn: "First visit (not yet welcomed)",
    nameVi: "Lần đầu (chưa chào mừng)",
    descriptionEn: "Has at least one check-in, first_visit_welcomed_at is empty",
    descriptionVi: "Đã check-in ít nhất 1 lần, chưa đánh dấu chào mừng lần đầu",
    ctaEn: "Send first-visit welcome",
    ctaVi: "Gửi chào mừng lần đầu",
    subject: "Thanks for visiting Leo Mây",
    body: `Hey [Name],

Thanks for coming to Leo Mây — we hope you had a great first session.

If you have any questions or want to plan your next visit, we're here to help.

See you on the wall,
Leo Mây Team`,
  },
];

/**
 * Reward by segment. Active / visit-pass cohorts get guest pass; lapsed or no-pass cohorts get free visit(s).
 */
export type CampaignSegmentReward = {
  type: "visits" | "guest_pass";
  amount: number;
  labelEn: string;
  labelVi: string;
};

export const CAMPAIGN_SEGMENT_REWARDS: Record<CampaignSegmentId, CampaignSegmentReward> = {
  expiring_soon_7d: {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit (renewal incentive)",
    labelVi: "1 lượt miễn phí (ưu đãi gia hạn)",
  },
  inactive_members_30d: {
    type: "visits",
    amount: 2,
    labelEn: "2 free visits (come back on us)",
    labelVi: "2 lượt miễn phí (quay lại với chúng tôi)",
  },
  visit_pass_users: {
    type: "guest_pass",
    amount: 1,
    labelEn: "1 guest pass (bring a friend)",
    labelVi: "1 vé khách (dẫn bạn bè cùng leo)",
  },
  highly_active_users: {
    type: "guest_pass",
    amount: 1,
    labelEn: "1 guest pass (bring a friend)",
    labelVi: "1 vé khách (dẫn bạn bè cùng leo)",
  },
  first_time_no_return: {
    type: "visits",
    amount: 2,
    labelEn: "2 free visits (your second climb is on us)",
    labelVi: "2 lượt miễn phí (lần leo thứ hai của bạn do chúng tôi tặng)",
  },
  near_conversion_users: {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit (one more climb before you join)",
    labelVi: "1 lượt miễn phí (một lần leo nữa trước khi bạn trở thành thành viên)",
  },
  dropped_active_users: {
    type: "visits",
    amount: 2,
    labelEn: "2 free visits (we saved your spot)",
    labelVi: "2 lượt miễn phí (chúng tôi đã giữ chỗ cho bạn)",
  },
  new_members_recent: {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit (welcome — come again soon)",
    labelVi: "1 lượt miễn phí (chào mừng — hẹn gặp lại bạn)",
  },
  birthday_this_week: {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit (birthday treat)",
    labelVi: "1 lượt miễn phí (quà sinh nhật)",
  },
  first_visit_not_welcomed: {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit (thanks for visiting)",
    labelVi: "1 lượt miễn phí (cảm ơn đã ghé)",
  },
};

export function getSegmentById(id: CampaignSegmentId): CampaignSegmentDefinition | undefined {
  return CAMPAIGN_SEGMENTS.find((s) => s.id === id);
}

/** Get reward config for a segment (for redemption). Legacy segment ids (from old campaign_logs) get 1 free visit. */
export function getRewardForSegment(segmentId: string): CampaignSegmentReward {
  const known = CAMPAIGN_SEGMENT_REWARDS[segmentId as CampaignSegmentId];
  if (known) return known;
  return {
    type: "visits",
    amount: 1,
    labelEn: "1 free visit",
    labelVi: "1 lượt miễn phí",
  };
}

/** Subject line: always make clear it's from Leo Mây and that a code is inside */
export function getSubjectWithBrand(subject: string): string {
  const trimmed = subject?.trim() || "";
  const withBrand = trimmed.toLowerCase().startsWith("leo mây") || trimmed.toLowerCase().startsWith("[leo mây]")
    ? trimmed
    : `Leo Mây — ${trimmed}`;
  if (withBrand.toLowerCase().includes("code inside") || withBrand.toLowerCase().includes("mã trong")) return withBrand;
  return `${withBrand} · Code inside`;
}

/** Marketing blasts: Leo Mây prefix only (no promo-code suffix). */
export function getMarketingSubject(subject: string): string {
  const trimmed = subject?.trim() || "";
  if (!trimmed) return "Leo Mây";
  if (trimmed.toLowerCase().startsWith("leo mây") || trimmed.toLowerCase().startsWith("[leo mây]")) return trimmed;
  return `Leo Mây — ${trimmed}`;
}

/** Replace [Name] with display name or full_name fallback */
export function renderBody(body: string, name: string): string {
  const displayName = name?.trim() || "there";
  return body.replace(/\[Name\]/g, displayName);
}

/** Base URL for campaign links and logo (always production). No trailing slash. */
export function getCampaignBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CAMPAIGN_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://leo-may-2026.com";
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  return url.replace(/\/$/, "");
}

/** Logo URL for emails (full URL so it loads in Gmail) */
export function getCampaignLogoUrl(): string {
  const base = getCampaignBaseUrl();
  return `${base}/logo.svg`;
}

/**
 * Build full campaign email HTML: dark text throughout, logo top + bottom, clear title, body, promo code (if any), CTA.
 * All text uses explicit dark color (#1e293b / #0f172a) so it's visible in any email client.
 */
export function bodyToHtml(
  body: string,
  options?: { promoCode?: string; locale?: "en" | "vi"; subject?: string; marketing?: boolean }
): string {
  const baseUrl = getCampaignBaseUrl();
  const logoUrl = getCampaignLogoUrl();
  const gymPath = options?.locale === "vi" ? "/vi/gym#intro" : "/en/gym#intro";
  const loginUrl = `${baseUrl}${gymPath}`;
  const displayUrl = `${baseUrl}${gymPath.replace(/#intro$/, "")}`;
  const ctaEn = options?.marketing
    ? `Visit us at <a href="${loginUrl}" style="color: #0d9488; font-weight: 600;">${displayUrl}</a> — sign in with your email to manage your membership, check in, and see what&apos;s new at Leo Mây.`
    : `Go to <a href="${loginUrl}" style="color: #0d9488; font-weight: 600;">${displayUrl}</a>, sign in with your email, and redeem your code in the dashboard to earn your benefits and visit the gym.`;
  const ctaVi = options?.marketing
    ? `Ghé <a href="${loginUrl}" style="color: #0d9488; font-weight: 600;">${displayUrl}</a> — đăng nhập bằng email để quản lý thành viên, check-in và xem tin mới tại Leo Mây.`
    : `Truy cập <a href="${loginUrl}" style="color: #0d9488; font-weight: 600;">${displayUrl}</a>, đăng nhập bằng email của bạn và nhập mã trong dashboard để nhận ưu đãi và tới phòng tập.`;
  const cta = options?.locale === "vi" ? ctaVi : ctaEn;
  const codeBlock =
    options?.promoCode && options.promoCode.trim()
      ? `<p style="margin: 1em 0 0 0; font-size: 14px; color: #1e293b;"><strong>${options.locale === "vi" ? "Mã ưu đãi của bạn" : "Your promo code"}:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 16px; color: #0f766e;">${options.promoCode}</code></p>`
      : "";

  const rawTitle = options?.subject?.trim() || "Leo Mây";
  const titleText = rawTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const bodyHtml = body
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 1em 0; color: #1e293b; font-size: 15px; line-height: 1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; color: #1e293b;">
  <div style="text-align: center; margin-bottom: 16px;">
    <img src="${logoUrl}" alt="Leo Mây" width="120" height="40" style="display: inline-block;" />
  </div>
  <h1 style="margin: 0 0 1em 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">${titleText}</h1>
  <div style="line-height: 1.6;">
    ${bodyHtml}
    <p style="margin: 1.5em 0 0 0; font-size: 15px; color: #1e293b;">${cta}</p>
    ${codeBlock}
  </div>
  <p style="margin: 2em 0 0 0; font-size: 13px; color: #475569;">Leo Mây Team</p>
  <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
    <img src="${logoUrl}" alt="Leo Mây" width="100" height="34" style="display: inline-block;" />
  </div>
</div>`;
}
