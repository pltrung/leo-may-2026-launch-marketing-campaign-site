import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday } from "@/lib/gymTimezone";
import { verifyQrToken } from "@/lib/qrTokens";
import { insertAdminAuditLog, getStaffIdFromAuthId } from "@/lib/auditLog";

/**
 * POST /api/admin/staff/checkin
 * Body: { staff_id?: string, qr?: string }
 * Records staff attendance for today as IN (QR check-in at front desk).
 * Admin or frontdesk can scan (so frontdesk at the desk can check in arriving staff/frontdesk).
 */
export async function POST(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || (unified.role !== "admin" && unified.role !== "frontdesk" && unified.role !== "checkin_operator"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const auditStaffId = unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id));
  await insertAdminAuditLog(supabase, {
    adminAuthId: unified.user.id,
    staffId: auditStaffId,
    actionType: "staff_checkin",
    entityId: staff.id,
  });

  return NextResponse.json({
    ok: true,
    staff: {
      display_name: staff.display_name ?? null,
      email: staff.email,
    },
  });
}

/**
 * GET /api/admin/staff/checkin?limit=10
 * Returns recent attendance rows for kiosk confirmation feed.
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || (unified.role !== "admin" && unified.role !== "frontdesk" && unified.role !== "checkin_operator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(rawLimit) ? Math.min(30, Math.max(1, Math.floor(rawLimit))) : 10;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff_attendance")
    .select("id, date, status, created_at, staff_id, staff_profiles(display_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkins: data ?? [] });
}
