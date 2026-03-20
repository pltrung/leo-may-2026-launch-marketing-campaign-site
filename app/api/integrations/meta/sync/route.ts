/**
 * POST /api/integrations/meta/sync
 * Stub: Sync ad stats from Meta Marketing API.
 * Requires META_ACCESS_TOKEN and app credentials. Returns 501 until configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.META_ACCESS_TOKEN ?? process.env.META_APP_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Meta API not configured. Set META_ACCESS_TOKEN or META_APP_TOKEN." },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: false,
    error: "Meta sync not implemented. Scaffold only. Configure credentials and implement fetch from Marketing API.",
  }, { status: 501 });
}
