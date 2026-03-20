/**
 * POST /api/integrations/tiktok/sync
 * Stub: Sync ad stats from TikTok Marketing API.
 * Requires TIKTOK_ACCESS_TOKEN. Returns 501 until configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.TIKTOK_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "TikTok API not configured. Set TIKTOK_ACCESS_TOKEN." },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: false,
    error: "TikTok sync not implemented. Scaffold only.",
  }, { status: 501 });
}
