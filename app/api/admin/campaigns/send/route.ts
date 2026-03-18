/**
 * POST /api/admin/campaigns/send
 * Body A: { segment, subject, body } — targeted segment + promo flow
 * Body B: { marketing_audience, subject, body } — marketing template, no promo code
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";
import {
  getSegmentById,
  getRewardForSegment,
  renderBody,
  bodyToHtml,
  getSubjectWithBrand,
  getMarketingSubject,
} from "@/lib/campaignSegments";
import { getSegmentRecipients } from "@/lib/campaignSegmentQueries";
import type { CampaignSegmentId } from "@/lib/campaignSegments";
import { getMarketingAudienceRecipients, isMarketingAudienceId } from "@/lib/marketingAudienceQueries";
import { sendEmail } from "@/lib/email/sendGmail";

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PROMO_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generatePromoCode(): string {
  let code = "LEO-";
  for (let i = 0; i < 8; i++) code += PROMO_CODE_CHARS[Math.floor(Math.random() * PROMO_CODE_CHARS.length)];
  return code;
}
function generateUniquePromoCode(existing: Set<string>): string {
  for (let tries = 0; tries < 100; tries++) {
    const code = generatePromoCode();
    if (!existing.has(code)) {
      existing.add(code);
      return code;
    }
  }
  return "LEO-" + Date.now().toString(36).toUpperCase().slice(-8);
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { segment?: string; marketing_audience?: string; subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const emailBody = typeof body.body === "string" ? body.body : "";
  const marketingAudience =
    typeof body.marketing_audience === "string" && isMarketingAudienceId(body.marketing_audience)
      ? body.marketing_audience
      : null;
  const segmentId = body.segment as CampaignSegmentId | undefined;

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  const supabase = createServerClient();

  if (marketingAudience) {
    const recipients = await getMarketingAudienceRecipients(supabase, marketingAudience);
    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, message: "No recipients in audience" });
    }

    const subjectWithBrand = getMarketingSubject(subject);
    const { data: insertedLog, error: logErr } = await supabase
      .from("campaign_logs")
      .insert({
        segment: marketingAudience,
        subject: subjectWithBrand,
        recipient_count: recipients.length,
        sent_at: new Date().toISOString(),
        status: "completed",
        promo_code: null,
      })
      .select("id")
      .single();

    if (logErr || !insertedLog?.id) {
      console.error("Campaign log insert error:", logErr);
      return NextResponse.json({ ok: false, sent: 0, error: "Failed to save campaign log" }, { status: 500 });
    }

    const campaignLogId = insertedLog.id;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((r) => {
          const text = renderBody(emailBody, r.name);
          const html = bodyToHtml(text, {
            marketing: true,
            locale: "en",
            subject: subjectWithBrand,
          });
          return sendEmail({ to: r.email, subject: subjectWithBrand, html, text }).then(() => {
            sent++;
          });
        })
      );
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
    }

    await supabase.from("campaign_log_recipients").insert(
      recipients.map((r) => ({ campaign_log_id: campaignLogId, member_id: r.member_id }))
    );

    return NextResponse.json({ ok: true, sent, marketing: true });
  }

  if (!segmentId) {
    return NextResponse.json({ error: "Missing segment or marketing_audience" }, { status: 400 });
  }

  const def = getSegmentById(segmentId);
  if (!def) {
    return NextResponse.json({ error: "Unknown segment" }, { status: 400 });
  }

  const recipients = await getSegmentRecipients(supabase, segmentId);
  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "No recipients in segment" });
  }

  const reward = getRewardForSegment(segmentId);
  const isGuestPass = reward.type === "guest_pass";
  const subjectWithBrand = getSubjectWithBrand(subject);
  const singlePromoCode = isGuestPass ? null : generatePromoCode();

  const { data: insertedLog, error: logErr } = await supabase
    .from("campaign_logs")
    .insert({
      segment: segmentId,
      subject: subjectWithBrand,
      recipient_count: recipients.length,
      sent_at: new Date().toISOString(),
      status: "completed",
      promo_code: singlePromoCode,
    })
    .select("id")
    .single();

  if (logErr || !insertedLog?.id) {
    console.error("Campaign log insert error:", logErr);
    return NextResponse.json({ ok: false, sent: 0, error: "Failed to save campaign log" }, { status: 500 });
  }

  const campaignLogId = insertedLog.id;
  const codeByMemberId = new Map<string, string>();
  if (isGuestPass) {
    const usedCodes = new Set<string>();
    const rows = recipients.map((r) => ({
      campaign_log_id: campaignLogId,
      member_id: r.member_id,
      promo_code: generateUniquePromoCode(usedCodes),
    }));
    const { error: codesErr } = await supabase.from("campaign_recipient_codes").insert(rows);
    if (codesErr) {
      console.error("Campaign recipient codes insert error:", codesErr);
      return NextResponse.json({ ok: false, sent: 0, error: "Failed to save recipient codes" }, { status: 500 });
    }
    rows.forEach((row) => codeByMemberId.set(row.member_id, row.promo_code));
  }

  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((r) => {
        const promoCode = isGuestPass ? (codeByMemberId.get(r.member_id) ?? "") : (singlePromoCode ?? "");
        const text = renderBody(emailBody, r.name);
        const html = bodyToHtml(text, { promoCode, locale: "en", subject: subjectWithBrand });
        return sendEmail({ to: r.email, subject: subjectWithBrand, html, text }).then(() => {
          sent++;
        });
      })
    );
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  if (recipients.length > 0) {
    await supabase.from("campaign_log_recipients").insert(
      recipients.map((r) => ({ campaign_log_id: campaignLogId, member_id: r.member_id }))
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    promoCode: singlePromoCode ?? undefined,
    codesPerRecipient: isGuestPass ? true : undefined,
  });
}
