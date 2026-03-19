import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { buildOccupancyPayload, defaultOperationalSettings, fetchGymOperationalSettings } from "@/lib/gymOperationalSettings";

export const dynamic = "force-dynamic";

/**
 * GET /api/occupancy
 * Distinct members checked in within last 2h + capacity settings for /dashboard banners.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const [{ data, error }, settings] = await Promise.all([
      supabase.from("gym_checkins").select("member_id").gte("timestamp", since),
      fetchGymOperationalSettings(supabase),
    ]);

    if (error) throw error;

    const uniqueIds = new Set((data ?? []).map((row) => row.member_id as string));
    const count = uniqueIds.size;
    const payload = buildOccupancyPayload(count, settings);

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("occupancy error", error);
    const fallback = buildOccupancyPayload(0, defaultOperationalSettings());
    return NextResponse.json(
      { ...fallback, error: "Failed to load occupancy" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
