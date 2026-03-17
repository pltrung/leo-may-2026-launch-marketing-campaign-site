import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getGymStartOfDay, getGymStartOfMonth, getGymToday } from "@/lib/gymTimezone";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/leaderboard
 * Authorization: Bearer <access_token>
 * Query: ?gender=male|female|all (default: all)
 *        ?period=week|month|all (default: month)
 *
 * Returns leaderboard by period:
 * - week: last 7 days
 * - month: current month
 * - all: all-time (total visits)
 * - top: top 20 members by visits (filtered by gender if specified)
 * - currentUser: current user's rank and visits in period
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: memberRow, error: memberErr } = await supabase
      .from("member_profiles")
      .select("id, full_name, display_name")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (memberErr || !memberRow?.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const periodParam = request.nextUrl.searchParams.get("period")?.trim().toLowerCase();
    const period = periodParam === "week" || periodParam === "all" ? periodParam : "month";

    let since: string;
    if (period === "week") {
      const gymToday = getGymToday();
      const startToday = getGymStartOfDay(gymToday);
      since = new Date(new Date(startToday).getTime() - 7 * 86400000).toISOString();
    } else if (period === "month") {
      since = getGymStartOfMonth();
    } else {
      since = new Date(0).toISOString();
    }

    const genderParam = request.nextUrl.searchParams.get("gender")?.trim().toLowerCase();
    const genderFilter = genderParam === "male" || genderParam === "female" ? genderParam : null;

    const { data: checkins, error: checkinErr } = await supabase
      .from("gym_checkins")
      .select("member_id, member:member_profiles(full_name, display_name, instagram_handle, gender, profile_photo_url)")
      .gte("timestamp", since);

    if (checkinErr) {
      console.error("Leaderboard checkins error:", checkinErr);
      return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
    }

    const counts = new Map<
      string,
      { member_id: string; full_name: string; instagram_handle: string | null; gender: string | null; profile_photo_url: string | null; visits: number }
    >();

    for (const row of checkins ?? []) {
      const memberId = (row as any).member_id as string;
      if (!memberId) continue;
      const member = (row as any).member;
      const rawName = (member?.display_name as string | null)?.trim() || (member?.full_name as string | null)?.trim();
      const fullName = rawName ?? "Member";
      const instagramHandle = (member?.instagram_handle as string | null) ?? null;
      const gender = (member?.gender as string | null) ?? null;
      const profilePhotoUrl = (member?.profile_photo_url as string | null) ?? null;

      if (genderFilter && gender !== genderFilter) continue;

      const existing = counts.get(memberId);
      if (existing) {
        existing.visits += 1;
      } else {
        counts.set(memberId, { member_id: memberId, full_name: fullName, instagram_handle: instagramHandle, gender, profile_photo_url: profilePhotoUrl, visits: 1 });
      }
    }

    const allEntries = Array.from(counts.values()).sort(
      (a, b) => b.visits - a.visits
    );

    const top = allEntries.slice(0, 20).map((entry, index) => ({
      rank: index + 1,
      member_id: entry.member_id,
      full_name: entry.full_name,
      instagram_handle: entry.instagram_handle,
      profile_photo_url: entry.profile_photo_url,
      visits: entry.visits,
    }));

    let currentUserRank: number | null = null;
    let currentUserVisits = 0;
    const idx = allEntries.findIndex((e) => e.member_id === memberRow.id);
    if (idx >= 0) {
      currentUserRank = idx + 1;
      currentUserVisits = allEntries[idx].visits;
    } else {
      currentUserRank = null;
      currentUserVisits = 0;
    }

    return NextResponse.json({
      period,
      top,
      currentUser: {
        rank: currentUserRank,
        visits: currentUserVisits,
        full_name: (memberRow.display_name ?? memberRow.full_name)?.trim() || "Member",
      },
    });
  } catch (e) {
    console.error("Leaderboard route error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

