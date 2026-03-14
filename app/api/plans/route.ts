import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * GET /api/plans - Returns membership plans (public, for dashboard purchase flow)
 */
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, name, duration_days, price_vnd, description")
    .order("duration_days", { ascending: true });
  if (error) {
    console.error("plans error", error);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
  // Exclude deprecated plans from dashboard purchase flow
  const excludedIds = ["until_end_of_year", "explorer_month", "explorer_year"];
  const plans = (data ?? []).filter((p) => !excludedIds.includes((p.id as string) ?? ""));
  return NextResponse.json({ plans }, { headers: { "Cache-Control": "no-store, max-age=60" } });
}
