import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { computeStreakUpdate, evaluateAndGrantAchievements } from "@/lib/achievements";

/**
 * Core check-in logic: validate member, insert gym_checkins, update streaks and achievements.
 * Only the first check-in per calendar day (gym TZ) counts: visits_remaining decrement, streaks, achievements.
 * Subsequent same-day check-ins are recorded but do not affect stats (prevents gaming).
 */
export async function performCheckIn(memberId: string, location: string | null): Promise<NextResponse> {
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

    const startOfToday = getGymStartOfDay();
    const endOfToday = getGymEndOfDay();
    const { count: todayCount } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("timestamp", startOfToday)
      .lte("timestamp", endOfToday);

    const alreadyCheckedInToday = (todayCount ?? 0) >= 1;

    if (alreadyCheckedInToday) {
      return NextResponse.json({ ok: true, already_checked_in_today: true });
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
