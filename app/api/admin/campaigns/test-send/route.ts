/**
 * POST /api/admin/campaigns/test-send
 * Sends one preview email to the logged-in admin/staff (Gmail).
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import {
  renderBody,
  bodyToHtml,
  getSubjectWithBrand,
  getMarketingSubject,
  isCampaignPromoKind,
  type CampaignPromoKind,
  type CampaignPosterPosition,
} from "@/lib/campaignSegments";
import { sendEmail } from "@/lib/email/sendGmail";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = (unified.user.email ?? "").trim();
  if (!to) {
    return NextResponse.json({ error: "Your account has no email for test send" }, { status: 400 });
  }

  let body: {
    subject?: string;
    body?: string;
    marketing?: boolean;
    locale?: string;
    promo_kind?: string;
    poster_image_url?: string;
    poster_position?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const emailBody = typeof body.body === "string" ? body.body : "";
  const marketing = !!body.marketing;
  const locale = body.locale === "vi" ? "vi" : "en";
  const rawPk = typeof body.promo_kind === "string" ? body.promo_kind.trim() : "";
  const promoKind: CampaignPromoKind | null = isCampaignPromoKind(rawPk) ? rawPk : null;

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "subject and body required" }, { status: 400 });
  }

  const withPromo = !!promoKind;
  const subjectLine =
    marketing && !withPromo ? getMarketingSubject(subject) : getSubjectWithBrand(subject);
  const previewName =
    unified.staffProfile?.display_name?.trim() ||
    unified.user.user_metadata?.full_name ||
    "You";
  const text = renderBody(emailBody, previewName);
  const sampleCode =
    promoKind === "guest_pass_friend" ? "LEO-PRETND1" : "LEO-PREVIEW1";
  const rawPoster = typeof body.poster_image_url === "string" ? body.poster_image_url.trim() : "";
  const posterImageUrl =
    rawPoster && (rawPoster.startsWith("https://") || rawPoster.startsWith("http://")) ? rawPoster : null;
  const posRaw = typeof body.poster_position === "string" ? body.poster_position.trim().toLowerCase() : "top";
  const posterPosition: CampaignPosterPosition | null = posterImageUrl
    ? posRaw === "bottom"
      ? "bottom"
      : "top"
    : null;
  const html = bodyToHtml(text, {
    marketing: marketing && !withPromo,
    locale,
    subject: subjectLine,
    promoCode: withPromo ? sampleCode : undefined,
    promoKind: promoKind ?? undefined,
    posterImageUrl,
    posterPosition,
  });

  try {
    await sendEmail({
      to,
      subject: `[TEST] ${subjectLine}`,
      html,
      text: `[TEST EMAIL — not sent to members]\n\n${text}`,
    });
    return NextResponse.json({ ok: true, sent_to: to });
  } catch (e) {
    console.error("test-send error", e);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
