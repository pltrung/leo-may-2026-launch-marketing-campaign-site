/**
 * POST /api/integrations/google-ads/sync
 * Stub: Sync ad stats from Google Ads API.
 * Requires GOOGLE_ADS_* credentials. Returns 501 until configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_ADS_CUSTOMER_ID) {
    return NextResponse.json(
      { error: "Google Ads API not configured. Set GOOGLE_ADS_CUSTOMER_ID and related credentials." },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: false,
    error: "Google Ads sync not implemented. Scaffold only.",
  }, { status: 501 });
}
