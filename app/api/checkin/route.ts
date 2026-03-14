import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

async function performCheckIn(memberId: string, location: string | null): Promise<NextResponse> {
  try {
    const supabase = createServerClient();
    const { data: profile, error: profileErr } = await supabase
      .from("member_profiles")
      .select("waiver_signed, membership_status, membership_expires_at, visits_remaining, profile_photo_url")
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

    const { error } = await supabase.from("gym_checkins").insert({
      member_id: memberId,
      location: location ?? null,
    });

    if (error) {
      console.error("Checkin insert error:", error);
      return NextResponse.json(
        { error: "Failed to record check-in" },
        { status: 500 }
      );
    }

    if (hasValidVisitPass) {
      await supabase
        .from("member_profiles")
        .update({ visits_remaining: visitsRemaining - 1, updated_at: new Date().toISOString() })
        .eq("id", memberId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checkin
 * Body: { member_id: string, location?: string }
 * Inserts a gym check-in. Used by admin "Check In" and "Manual Check-In" buttons.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : null;
    const location = typeof body.location === "string" ? body.location.trim() : null;

    if (!memberId) {
      return NextResponse.json({ error: "member_id required" }, { status: 400 });
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
