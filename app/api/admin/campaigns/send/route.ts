/**
 * POST /api/admin/campaigns/send
 * Admin-only. Sends campaign email to segment recipients via Gmail API.
 * Body: { segment: string, subject: string, body: string }
 * Generates a promo code per send; logs to campaign_logs. Batches of 15, 500ms delay.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";
import { getSegmentById, renderBody, bodyToHtml, getSubjectWithBrand } from "@/lib/campaignSegments";
import { getSegmentRecipients } from "@/lib/campaignSegmentQueries";
import type { CampaignSegmentId } from "@/lib/campaignSegments";
import { sendEmail } from "@/lib/email/sendGmail";

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generatePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LEO-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { segment?: string; subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const segmentId = body.segment as CampaignSegmentId | undefined;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const emailBody = typeof body.body === "string" ? body.body : "";

  if (!segmentId || !subject || !emailBody) {
    return NextResponse.json(
      { error: "Missing or invalid segment, subject, or body" },
      { status: 400 }
    );
  }
  const def = getSegmentById(segmentId);
  if (!def) {
    return NextResponse.json({ error: "Unknown segment" }, { status: 400 });
  }

  const supabase = createServerClient();
  const recipients = await getSegmentRecipients(supabase, segmentId);
  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "No recipients in segment" });
  }

  const promoCode = generatePromoCode();
  const subjectWithBrand = getSubjectWithBrand(subject);

  let sent = 0;
  const batches: { email: string; name: string }[][] = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    await Promise.all(
      batch.map((r) => {
        const text = renderBody(emailBody, r.name);
        const html = bodyToHtml(text, { promoCode, locale: "en", subject: subjectWithBrand });
        return sendEmail({ to: r.email, subject: subjectWithBrand, html, text }).then(() => {
          sent++;
        });
      })
    );
    if (b < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  const { data: insertedLog, error: logErr } = await supabase
    .from("campaign_logs")
    .insert({
      segment: segmentId,
      subject: subjectWithBrand,
      recipient_count: sent,
      sent_at: new Date().toISOString(),
      status: "completed",
      promo_code: promoCode,
    })
    .select("id")
    .single();

  if (logErr || !insertedLog?.id) {
    console.error("Campaign log insert error:", logErr);
    return NextResponse.json({ ok: false, sent, error: "Failed to save campaign log" }, { status: 500 });
  }

  if (recipients.length > 0) {
    await supabase.from("campaign_log_recipients").insert(
      recipients.map((r) => ({ campaign_log_id: insertedLog.id, member_id: r.member_id }))
    );
  }

  return NextResponse.json({ ok: true, sent, promoCode });
}
