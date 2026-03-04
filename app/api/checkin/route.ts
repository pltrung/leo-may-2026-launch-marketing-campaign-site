import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * POST /api/checkin
 * Body: { member_id: string }
 * Inserts a gym check-in. Verification is server-side when staff scans QR.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : null;
    const location = typeof body.location === "string" ? body.location.trim() : null;

    if (!memberId) {
      return NextResponse.json({ error: "member_id required" }, { status: 400 });
    }

    const supabase = createServerClient();
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
