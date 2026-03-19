import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { filterUpcomingBirthdays, type MemberBirthdayRow } from "@/lib/birthdayQueueGym";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/gym-ops-digest?secret=CRON_SECRET
 * Lightweight ops snapshot for monitoring / manual cron (no SMS sent).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const q = req.nextUrl.searchParams.get("secret");
  if (!secret || q !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const [incidents, upcomingBirthdays, openMaint] = await Promise.all([
      supabase
        .from("facility_incidents")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("member_profiles")
        .select("id, full_name, phone, date_of_birth, birthday_message_sent_year")
        .not("date_of_birth", "is", null)
        .limit(5000),
      supabase
        .from("facility_maintenance_tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
    ]);

    const rows = (upcomingBirthdays.data ?? []) as MemberBirthdayRow[];
    const upcoming = filterUpcomingBirthdays(rows, 7);

    return NextResponse.json({
      ok: true,
      open_incidents: incidents.count ?? 0,
      open_maintenance: openMaint.count ?? 0,
      birthdays_next_7_days: upcoming.length,
      sample_birthdays: upcoming.slice(0, 5).map((b) => ({
        id: b.id,
        name: b.full_name,
        next: b.nextOccurrenceYmd,
      })),
    });
  } catch (e) {
    console.error("gym-ops-digest", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
