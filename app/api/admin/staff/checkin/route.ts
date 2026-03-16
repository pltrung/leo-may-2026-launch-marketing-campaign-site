import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getGymToday } from "@/lib/gymTimezone";
import { verifyQrToken } from "@/lib/qrTokens";

/**
 * POST /api/admin/staff/checkin
 * Body: { staff_id?: string, qr?: string }
 * Records staff attendance for today as IN (QR check-in at front desk). Admin only.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { staff_id?: string; qr?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawQr = typeof body.qr === "string" ? body.qr.trim() : null;
  let staffId = body.staff_id?.trim() || null;

  if (!staffId && rawQr) {
    const { ok, id, error } = verifyQrToken("staff", rawQr, 60);
    if (!ok || !id) {
      return NextResponse.json({ error: error ?? "Invalid or expired staff QR token" }, { status: 400 });
    }
    staffId = id;
  }

  if (!staffId) return NextResponse.json({ error: "staff_id or qr required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: staff, error: staffErr } = await supabase
    .from("staff_profiles")
    .select("id, email, display_name")
    .eq("id", staffId)
    .single();

  if (staffErr || !staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = getGymToday();
  const { error: upsertErr } = await supabase
    .from("staff_attendance")
    .upsert(
      { staff_id: staff.id, date: today, status: "IN" },
      { onConflict: "staff_id,date" }
    );

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    staff: {
      display_name: staff.display_name ?? null,
      email: staff.email,
    },
  });
}
