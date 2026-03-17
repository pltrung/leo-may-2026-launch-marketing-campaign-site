import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();

  try {
    // Approximate occupancy as distinct members who checked in in the last 2 hours.
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("gym_checkins")
      .select("member_id")
      .gte("timestamp", since);

    if (error) {
      throw error;
    }

    const uniqueIds = new Set((data ?? []).map((row) => row.member_id as string));
    return NextResponse.json({ count: uniqueIds.size }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("admin occupancy error", error);
    return NextResponse.json({ count: 0, error: "Failed to load occupancy" }, { status: 500 });
  }
}

