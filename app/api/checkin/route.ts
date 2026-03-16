import { NextRequest, NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/qrTokens";
import { performCheckIn } from "@/lib/performCheckIn";

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
 * GET /api/checkin?member_id=xxx&qr=TOKEN
 * If qr is present, it is verified and used as source of truth for member ID.
 * Otherwise falls back to member_id for legacy/static QR codes.
 * All check-in paths (POST and GET) insert into gym_checkins and trigger Realtime.
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const rawQr = search.get("qr")?.trim() ?? null;
  let memberId = search.get("member_id")?.trim() ?? null;

  if (rawQr) {
    const { ok, id, error } = verifyQrToken("member", rawQr, 60);
    if (!ok || !id) {
      return NextResponse.json({ error: error ?? "Invalid or expired QR token" }, { status: 400 });
    }
    memberId = id;
  }

  if (!memberId) {
    return NextResponse.json({ error: "member_id or qr required" }, { status: 400 });
  }

  return performCheckIn(memberId, null);
}
