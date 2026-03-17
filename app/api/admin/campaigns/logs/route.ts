/**
 * GET /api/admin/campaigns/logs
 * Admin-only. Returns recent campaign_logs for the Email campaigns UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";

const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("campaign_logs")
    .select("id, segment, subject, recipient_count, sent_at, status, promo_code")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const logs = data ?? [];
  const logIds = logs.map((l: { id: string }) => l.id);
  const counts: Record<string, number> = {};
  logIds.forEach((id: string) => { counts[id] = 0; });
  if (logIds.length > 0) {
    const { data: redemptions } = await supabase
      .from("campaign_code_redemptions")
      .select("campaign_log_id")
      .in("campaign_log_id", logIds);
    (redemptions ?? []).forEach((r: { campaign_log_id: string }) => {
      counts[r.campaign_log_id] = (counts[r.campaign_log_id] ?? 0) + 1;
    });
  }
  const logsWithCounts = logs.map((l: { id: string; [k: string]: unknown }) => ({
    ...l,
    redemption_count: counts[l.id] ?? 0,
  }));
  return NextResponse.json({ logs: logsWithCounts });
}
