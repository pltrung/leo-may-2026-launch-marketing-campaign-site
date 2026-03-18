/**
 * POST /api/admin/campaigns/test-send
 * Sends one preview email to the logged-in admin/staff (Gmail).
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { renderBody, bodyToHtml, getSubjectWithBrand, getMarketingSubject } from "@/lib/campaignSegments";
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

  let body: { subject?: string; body?: string; marketing?: boolean; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const emailBody = typeof body.body === "string" ? body.body : "";
  const marketing = !!body.marketing;
  const locale = body.locale === "vi" ? "vi" : "en";

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "subject and body required" }, { status: 400 });
  }

  const subjectLine = marketing ? getMarketingSubject(subject) : getSubjectWithBrand(subject);
  const previewName =
    unified.staffProfile?.display_name?.trim() ||
    unified.user.user_metadata?.full_name ||
    "You";
  const text = renderBody(emailBody, previewName);
  const html = bodyToHtml(text, {
    marketing,
    locale,
    subject: subjectLine,
    promoCode: marketing ? undefined : "LEO-TEST-XXXX",
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
