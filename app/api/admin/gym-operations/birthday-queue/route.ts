import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/gymOperationsAdminAuth";
import { filterUpcomingBirthdays, type MemberBirthdayRow } from "@/lib/birthdayQueueGym";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const days = Math.min(60, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "14", 10) || 14));
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("member_profiles")
    .select("id, full_name, phone, date_of_birth, birthday_message_sent_year")
    .not("date_of_birth", "is", null)
    .limit(5000);
  if (error) {
    console.error("birthday-queue", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
  const rows = (data ?? []) as MemberBirthdayRow[];
  const upcoming = filterUpcomingBirthdays(rows, days);
  const year = new Date().getFullYear();
  return NextResponse.json({ upcoming, hintYear: year, days });
}
