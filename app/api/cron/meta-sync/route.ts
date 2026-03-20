/**
 * GET /api/cron/meta-sync
 * Daily cron: sync Meta ad stats into ad_campaign_daily_stats.
 * Call with: Authorization: Bearer <CRON_SECRET>
 * Add to vercel.json crons for automatic daily sync.
 */
import { NextRequest, NextResponse } from "next/server";
import { runMetaSync } from "@/lib/metaSync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMetaSync(30);

  if (!result.ok) {
    if (result.error.includes("not configured")) {
      return NextResponse.json({ ok: false, skipped: true, reason: result.error }, { status: 200 });
    }
    return NextResponse.json(
      { ok: false, error: result.error, detail: result.detail },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}
