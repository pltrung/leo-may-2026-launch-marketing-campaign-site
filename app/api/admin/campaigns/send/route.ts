/**
 * POST /api/admin/campaigns/send
 * Body A: { segment, subject, body, promo_kind? } — targeted segment + promo
 * Body B: { marketing_audience, subject, body, promo_kind? } — optional promo
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
  isCampaignPromoKind,
  usesPerRecipientPromoCodes,
  type CampaignPromoKind,
} from "@/lib/campaignSegments";
import { getSegmentRecipients } from "@/lib/campaignSegmentQueries";
import type { CampaignSegmentId } from "@/lib/campaignSegments";
import { getMarketingAudienceRecipients, isMarketingAudienceId } from "@/lib/marketingAudienceQueries";
import { sendEmail } from "@/lib/email/sendGmail";
import { getGymDateFromISO, getGymToday } from "@/lib/gymTimezone";
import { isValidCampaignEmail } from "@/lib/campaignEmail";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Long-running batch sends (Vercel/serverless); avoids cutting the HTTP response mid-flight. */
export const maxDuration = 300;

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 500;

type CampaignRecipient = { email: string; member_id: string; name: string };

/**
 * Send in batches; one Gmail error or invalid address must not fail the whole campaign.
 */
async function deliverCampaignEmails(
  recipients: CampaignRecipient[],
  sendOne: (r: CampaignRecipient) => Promise<void>
): Promise<{ sent: number; failed: number; skipped_invalid: number }> {
  let sent = 0;
  let failed = 0;
  let skipped_invalid = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    for (const r of batch) {
      if (!isValidCampaignEmail(r.email)) {
        skipped_invalid++;
        console.warn("[campaign send] skip invalid email", { member_id: r.member_id });
        continue;
      }
      try {
        await sendOne(r);
        sent++;
      } catch (e) {
        failed++;
        console.error("[campaign send] Gmail error", {
          member_id: r.member_id,
          email: r.email?.trim(),
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }
  return { sent, failed, skipped_invalid };
}

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

function perRecipientForPromo(promoKind: CampaignPromoKind | null, segmentId: string): boolean {
  if (promoKind) return usesPerRecipientPromoCodes(promoKind);
  return getRewardForSegment(segmentId).type === "guest_pass";
}

async function campaignAlreadySentToday(supabase: SupabaseClient, campaignKey: string): Promise<boolean> {
  const { data } = await supabase
    .from("campaign_logs")
    .select("sent_at")
    .eq("status", "completed")
    .eq("segment", campaignKey)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = data?.sent_at as string | undefined;
  if (!last) return false;
  return getGymDateFromISO(last) === getGymToday();
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    segment?: string;
    marketing_audience?: string;
    subject?: string;
    body?: string;
    promo_kind?: string;
  };
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
  const rawPromo = typeof body.promo_kind === "string" ? body.promo_kind.trim() : "";
  const promoKind: CampaignPromoKind | null = isCampaignPromoKind(rawPromo) ? rawPromo : null;

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  const supabase = createServerClient();

  if (marketingAudience) {
    if (await campaignAlreadySentToday(supabase, marketingAudience)) {
      return NextResponse.json(
        {
          error:
            "This audience already had a campaign send today (gym calendar). Try again tomorrow.",
          code: "already_sent_today",
        },
        { status: 409 }
      );
    }
    const recipients = await getMarketingAudienceRecipients(supabase, marketingAudience);
    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, message: "No recipients in audience" });
    }

    const withPromo = !!promoKind;
    const subjectWithBrand = withPromo ? getSubjectWithBrand(subject) : getMarketingSubject(subject);
    const singlePromoCode = withPromo && promoKind && !usesPerRecipientPromoCodes(promoKind) ? generatePromoCode() : null;

    const { data: insertedLog, error: logErr } = await supabase
      .from("campaign_logs")
      .insert({
        segment: marketingAudience,
        subject: subjectWithBrand,
        recipient_count: recipients.length,
        sent_at: new Date().toISOString(),
        status: "completed",
        promo_code: singlePromoCode,
        promo_kind: promoKind,
      })
      .select("id")
      .single();

    if (logErr || !insertedLog?.id) {
      console.error("Campaign log insert error:", logErr);
      return NextResponse.json({ ok: false, sent: 0, error: "Failed to save campaign log" }, { status: 500 });
    }

    const campaignLogId = insertedLog.id;
    const codeByMemberId = new Map<string, string>();
    if (withPromo && promoKind && usesPerRecipientPromoCodes(promoKind)) {
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

    let sendStats = { sent: 0, failed: 0, skipped_invalid: 0 };
    try {
      sendStats = await deliverCampaignEmails(recipients as CampaignRecipient[], async (r) => {
        const text = renderBody(emailBody, r.name);
        const perRc = promoKind ? usesPerRecipientPromoCodes(promoKind) : false;
        const promoCode =
          withPromo && promoKind ? (perRc ? (codeByMemberId.get(r.member_id) ?? "") : (singlePromoCode ?? "")) : "";
        const html = bodyToHtml(text, {
          marketing: !withPromo,
          locale: "en",
          subject: subjectWithBrand,
          promoCode: promoCode || undefined,
          promoKind: withPromo ? promoKind : null,
        });
        await sendEmail({ to: r.email.trim(), subject: subjectWithBrand, html, text });
      });
    } finally {
      const { error: recErr } = await supabase.from("campaign_log_recipients").insert(
        recipients.map((r) => ({ campaign_log_id: campaignLogId, member_id: r.member_id }))
      );
      if (recErr) console.error("campaign_log_recipients insert error:", recErr);
    }

    return NextResponse.json({
      ok: true,
      sent: sendStats.sent,
      failed: sendStats.failed,
      skipped_invalid: sendStats.skipped_invalid,
      targeted: recipients.length,
      marketing: true,
      promoCode: singlePromoCode ?? undefined,
      codesPerRecipient: withPromo && promoKind && usesPerRecipientPromoCodes(promoKind) ? true : undefined,
    });
  }

  if (!segmentId) {
    return NextResponse.json({ error: "Missing segment or marketing_audience" }, { status: 400 });
  }

  const def = getSegmentById(segmentId);
  if (!def) {
    return NextResponse.json({ error: "Unknown segment" }, { status: 400 });
  }

  if (await campaignAlreadySentToday(supabase, segmentId)) {
    return NextResponse.json(
      {
        error:
          "This segment already had a campaign send today (gym calendar). Try again tomorrow.",
        code: "already_sent_today",
      },
      { status: 409 }
    );
  }

  const recipients = await getSegmentRecipients(supabase, segmentId);
  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "No recipients in segment" });
  }

  const isGuestPass = perRecipientForPromo(promoKind, segmentId);
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
      promo_kind: promoKind,
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

  let sendStats = { sent: 0, failed: 0, skipped_invalid: 0 };
  try {
    sendStats = await deliverCampaignEmails(recipients as CampaignRecipient[], async (r) => {
      const promoCode = isGuestPass ? (codeByMemberId.get(r.member_id) ?? "") : (singlePromoCode ?? "");
      const text = renderBody(emailBody, r.name);
      const html = bodyToHtml(text, {
        promoCode,
        promoKind: promoKind ?? undefined,
        locale: "en",
        subject: subjectWithBrand,
      });
      await sendEmail({ to: r.email.trim(), subject: subjectWithBrand, html, text });
    });
  } finally {
    if (recipients.length > 0) {
      const { error: recErr } = await supabase.from("campaign_log_recipients").insert(
        recipients.map((r) => ({ campaign_log_id: campaignLogId, member_id: r.member_id }))
      );
      if (recErr) console.error("campaign_log_recipients insert error:", recErr);
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sendStats.sent,
    failed: sendStats.failed,
    skipped_invalid: sendStats.skipped_invalid,
    targeted: recipients.length,
    promoCode: singlePromoCode ?? undefined,
    codesPerRecipient: isGuestPass ? true : undefined,
  });
}
