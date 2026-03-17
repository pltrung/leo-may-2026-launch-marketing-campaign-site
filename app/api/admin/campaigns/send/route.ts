/**
 * POST /api/admin/campaigns/send
 * Admin-only. Sends campaign email to segment recipients via Gmail API.
 * Body: { segment: string, subject: string, body: string }
 * Batches of 15, 500ms delay between batches. Logs to campaign_logs.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";
import { getSegmentById, renderBody, bodyToHtml } from "@/lib/campaignSegments";
import { getSegmentRecipients } from "@/lib/campaignSegmentQueries";
import type { CampaignSegmentId } from "@/lib/campaignSegments";
import { sendEmail } from "@/lib/email/sendGmail";

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        const html = bodyToHtml(text);
        return sendEmail({ to: r.email, subject, html, text }).then(() => {
          sent++;
        });
      })
    );
    if (b < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  await supabase.from("campaign_logs").insert({
    segment: segmentId,
    subject,
    recipient_count: sent,
    sent_at: new Date().toISOString(),
    status: "completed",
  });

  return NextResponse.json({ ok: true, sent });
}
