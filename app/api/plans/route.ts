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
  return NextResponse.json({ plans: data ?? [] }, { headers: { "Cache-Control": "no-store, max-age=60" } });
}
