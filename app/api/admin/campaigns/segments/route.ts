/**
 * GET /api/admin/campaigns/segments
 * Admin-only. Returns campaign segments with recipient counts and templates.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";
import { CAMPAIGN_SEGMENTS } from "@/lib/campaignSegments";
import { getSegmentRecipients } from "@/lib/campaignSegmentQueries";
import type { CampaignSegmentId } from "@/lib/campaignSegments";
import { MARKETING_AUDIENCES, getMarketingAudienceRecipients } from "@/lib/marketingAudienceQueries";
import { getGymDateFromISO, getGymToday } from "@/lib/gymTimezone";

/** Latest completed send per segment / audience id (for rate-limit + “last sent” UI). */
async function getLastSentBySegmentKey(
  supabase: ReturnType<typeof createServerClient>
): Promise<{ lastByKey: Record<string, string>; gymToday: string }> {
  const gymToday = getGymToday();
  const { data: rows, error } = await supabase.from("campaign_last_sent_by_segment").select("campaign_key, last_sent_at");
  const lastByKey: Record<string, string> = {};
  if (!error) {
    for (const row of rows ?? []) {
      const key = row.campaign_key as string;
      const at = row.last_sent_at as string;
      if (key && at) lastByKey[key] = at;
    }
    return { lastByKey, gymToday };
  }
  console.warn("campaign_last_sent_by_segment view missing or error, falling back:", error.message);
  const { data: all } = await supabase.from("campaign_logs").select("segment, sent_at").eq("status", "completed");
  for (const row of all ?? []) {
    const key = row.segment as string;
    const at = row.sent_at as string;
    if (!key || !at) continue;
    const prev = lastByKey[key];
    if (!prev || at > prev) lastByKey[key] = at;
  }
  return { lastByKey, gymToday };
}

function attachSendMeta(
  id: string,
  lastByKey: Record<string, string>,
  gymToday: string
): { last_sent_at: string | null; sent_today: boolean } {
  const last = lastByKey[id] ?? null;
  const sent_today = last ? getGymDateFromISO(last) === gymToday : false;
  return { last_sent_at: last, sent_today };
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { lastByKey, gymToday } = await getLastSentBySegmentKey(supabase);

  const segmentsWithCounts = await Promise.all(
    CAMPAIGN_SEGMENTS.map(async (seg) => {
      const recipients = await getSegmentRecipients(supabase, seg.id as CampaignSegmentId);
      const meta = attachSendMeta(seg.id, lastByKey, gymToday);
      return {
        id: seg.id,
        nameEn: seg.nameEn,
        nameVi: seg.nameVi,
        descriptionEn: seg.descriptionEn,
        descriptionVi: seg.descriptionVi,
        ctaEn: seg.ctaEn,
        ctaVi: seg.ctaVi,
        subject: seg.subject,
        body: seg.body,
        count: recipients.length,
        ...meta,
      };
    })
  );

  const marketingAudiences = await Promise.all(
    MARKETING_AUDIENCES.map(async (a) => {
      const recipients = await getMarketingAudienceRecipients(supabase, a.id);
      const meta = attachSendMeta(a.id, lastByKey, gymToday);
      return {
        id: a.id,
        nameEn: a.nameEn,
        nameVi: a.nameVi,
        descriptionEn: a.descriptionEn,
        descriptionVi: a.descriptionVi,
        count: recipients.length,
        ...meta,
      };
    })
  );

  return NextResponse.json({ segments: segmentsWithCounts, marketingAudiences, gym_today: gymToday });
}
