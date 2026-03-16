import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { verifyQrToken } from "@/lib/qrTokens";
import { computeStreakUpdate, evaluateAndGrantAchievements } from "@/lib/achievements";

async function performCheckIn(memberId: string, location: string | null): Promise<NextResponse> {
  try {
    const supabase = createServerClient();
    const { data: profile, error: profileErr } = await supabase
      .from("member_profiles")
      .select("waiver_signed, membership_status, membership_expires_at, visits_remaining, profile_photo_url, current_streak, best_streak, last_checkin_date")
      .eq("id", memberId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!profile.waiver_signed) {
      return NextResponse.json(
        { error: "Waiver must be signed before check-in. Please complete the waiver in the dashboard." },
        { status: 403 }
      );
    }

    if (!profile.profile_photo_url || !(profile.profile_photo_url as string).trim()) {
      return NextResponse.json(
        { error: "Profile photo required before check-in. Please complete your profile in the dashboard." },
        { status: 403 }
      );
    }

    const status = (profile.membership_status as string) ?? "inactive";
    const expiresAt = profile.membership_expires_at
      ? new Date(profile.membership_expires_at as string)
      : null;
    const visitsRemaining = (profile.visits_remaining as number) ?? 0;
    const hasValidDayPass = status === "active" && expiresAt && expiresAt.getTime() > Date.now();
    const hasValidVisitPass = visitsRemaining > 0;
    const hasValidMembership = hasValidDayPass || hasValidVisitPass;

    if (!hasValidMembership) {
      return NextResponse.json(
        { error: "Membership inactive or expired. Purchase a pass to check in." },
        { status: 403 }
      );
    }

    const { data: inserted, error } = await supabase
      .from("gym_checkins")
      .insert({
        member_id: memberId,
        location: location ?? null,
      })
      .select("timestamp")
      .single();

    if (error) {
      console.error("Checkin insert error:", error);
      return NextResponse.json(
        { error: "Failed to record check-in" },
        { status: 500 }
      );
    }

    const checkinTimestamp = (inserted?.timestamp as string) ?? new Date().toISOString();

    if (hasValidVisitPass) {
      await supabase
        .from("member_profiles")
        .update({ visits_remaining: visitsRemaining - 1, updated_at: new Date().toISOString() })
        .eq("id", memberId);
    }

    const currentStreak = (profile.current_streak as number) ?? 0;
    const bestStreak = (profile.best_streak as number) ?? 0;
    const lastCheckinDate = (profile.last_checkin_date as string | null) ?? null;

    const { newCurrentStreak, newBestStreak, newLastCheckinDate } = computeStreakUpdate(
      lastCheckinDate,
      currentStreak,
      bestStreak,
      checkinTimestamp
    );

    await supabase
      .from("member_profiles")
      .update({
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_checkin_date: newLastCheckinDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    const { count } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId);

    const totalVisits = count ?? 0;

    const newlyGranted = await evaluateAndGrantAchievements(supabase, memberId, {
      totalVisits,
      currentStreak: newCurrentStreak,
      checkinTimestamp,
    });

    return NextResponse.json({ ok: true, new_achievements: newlyGranted });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checkin
 * Body: { member_id?: string, qr?: string, location?: string }
 * Inserts a gym check-in. Used by admin "Check In", "Manual Check-In", and QR quick check-in.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawQr = typeof body.qr === "string" ? body.qr.trim() : null;
    let memberId = typeof body.member_id === "string" ? body.member_id.trim() : null;
    const location = typeof body.location === "string" ? body.location.trim() : null;

    if (!memberId && rawQr) {
      const { ok, id, error } = verifyQrToken("member", rawQr, 60);
      if (!ok || !id) {
        return NextResponse.json({ error: error ?? "Invalid or expired QR token" }, { status: 400 });
      }
      memberId = id;
    }

    if (!memberId) {
      return NextResponse.json({ error: "member_id or qr required" }, { status: 400 });
    }

    return performCheckIn(memberId, location);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkin?member_id=xxx
 * Same check-in logic as POST. Use for QR codes that encode a URL, or links.
 * All check-in paths (POST and GET) insert into gym_checkins and trigger Realtime.
 */
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("member_id")?.trim() ?? null;

  if (!memberId) {
    return NextResponse.json({ error: "member_id required" }, { status: 400 });
  }

  return performCheckIn(memberId, null);
}
