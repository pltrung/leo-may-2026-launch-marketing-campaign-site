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

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const segmentsWithCounts = await Promise.all(
    CAMPAIGN_SEGMENTS.map(async (seg) => {
      const recipients = await getSegmentRecipients(supabase, seg.id as CampaignSegmentId);
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
      };
    })
  );

  const marketingAudiences = await Promise.all(
    MARKETING_AUDIENCES.map(async (a) => {
      const recipients = await getMarketingAudienceRecipients(supabase, a.id);
      return {
        id: a.id,
        nameEn: a.nameEn,
        nameVi: a.nameVi,
        descriptionEn: a.descriptionEn,
        descriptionVi: a.descriptionVi,
        count: recipients.length,
      };
    })
  );

  return NextResponse.json({ segments: segmentsWithCounts, marketingAudiences });
}
