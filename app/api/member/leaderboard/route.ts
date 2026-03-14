import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/leaderboard
 * Authorization: Bearer <access_token>
 * Query: ?gender=male|female|all (default: all)
 *
 * Returns monthly gym check-in leaderboard for current month:
 * - top: top 20 members by visits (filtered by gender if specified)
 * - currentUser: current user's rank and visits this month
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
      .select("id, full_name")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (memberErr || !memberRow?.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const genderParam = request.nextUrl.searchParams.get("gender")?.trim().toLowerCase();
    const genderFilter = genderParam === "male" || genderParam === "female" ? genderParam : null;

    const { data: checkins, error: checkinErr } = await supabase
      .from("gym_checkins")
      .select("member_id, member:member_profiles(full_name, instagram_handle, gender)")
      .gte("timestamp", monthStart.toISOString());

    if (checkinErr) {
      console.error("Leaderboard checkins error:", checkinErr);
      return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
    }

    const counts = new Map<
      string,
      { member_id: string; full_name: string; instagram_handle: string | null; gender: string | null; visits: number }
    >();

    for (const row of checkins ?? []) {
      const memberId = (row as any).member_id as string;
      if (!memberId) continue;
      const member = (row as any).member;
      const fullName = (member?.full_name as string | null) ?? "Member";
      const instagramHandle = (member?.instagram_handle as string | null) ?? null;
      const gender = (member?.gender as string | null) ?? null;

      if (genderFilter && gender !== genderFilter) continue;

      const existing = counts.get(memberId);
      if (existing) {
        existing.visits += 1;
      } else {
        counts.set(memberId, { member_id: memberId, full_name: fullName, instagram_handle: instagramHandle, gender, visits: 1 });
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
      top,
      currentUser: {
        rank: currentUserRank,
        visits: currentUserVisits,
        full_name: memberRow.full_name ?? "Member",
      },
    });
  } catch (e) {
    console.error("Leaderboard route error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

