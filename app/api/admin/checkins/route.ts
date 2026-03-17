import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canDoCheckIn } from "@/lib/unifiedAdminAuth";
import { getGymStartOfDay, getGymToday, getGymDateFromISO } from "@/lib/gymTimezone";

/**
 * GET /api/admin/checkins
 * ?days=7 — recent check-ins from last N days (default 7)
 * ?date=YYYY-MM-DD — check-ins for a specific day
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canDoCheckIn(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10) || 7;
  const dateParam = req.nextUrl.searchParams.get("date")?.trim();

  try {
    let since: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      since = getGymStartOfDay(dateParam);
    } else {
      const gymToday = getGymToday();
      const startOfToday = getGymStartOfDay(gymToday);
      since = new Date(new Date(startOfToday).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: rows, error } = await supabase
      .from("gym_checkins")
      .select("id, member_id, timestamp")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(500);

    if (error) throw error;

    const memberIds = Array.from(new Set((rows ?? []).map((r) => r.member_id as string)));
    if (memberIds.length === 0) {
      return NextResponse.json(
        { checkins: [], byDay: {} },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const { data: profiles } = await supabase
      .from("member_profiles")
      .select("id, full_name, member_code")
      .in("id", memberIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        { name: (p.full_name as string) ?? "Member", code: (p.member_code as string) ?? null },
      ])
    );

    const checkins = (rows ?? []).map((r) => ({
      id: r.id,
      member_id: r.member_id,
      member_name: profileMap.get(r.member_id as string)?.name ?? "Unknown",
      member_code: profileMap.get(r.member_id as string)?.code ?? null,
      timestamp: r.timestamp,
    }));

    const byDay: Record<string, typeof checkins> = {};
    for (const c of checkins) {
      const date = getGymDateFromISO(c.timestamp as string);
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(c);
    }

    return NextResponse.json(
      { checkins, byDay },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("admin checkins error", e);
    return NextResponse.json({ error: "Failed to load check-ins" }, { status: 500 });
  }
}
