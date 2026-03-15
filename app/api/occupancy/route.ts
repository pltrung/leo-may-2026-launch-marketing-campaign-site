import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * GET /api/occupancy
 * Returns current gym occupancy (count of distinct members who checked in within last 2 hours).
 * Public endpoint for dashboard display; admin APIs remain protected.
 */
export async function GET() {
  const supabase = createServerClient();

  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("gym_checkins")
      .select("member_id")
      .gte("timestamp", since);

    if (error) throw error;

    const uniqueIds = new Set((data ?? []).map((row) => row.member_id as string));
    return NextResponse.json(
      { count: uniqueIds.size },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("occupancy error", error);
    return NextResponse.json({ count: 0, error: "Failed to load occupancy" }, { status: 500 });
  }
}
