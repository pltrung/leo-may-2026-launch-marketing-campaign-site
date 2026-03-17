import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessOperations } from "@/lib/unifiedAdminAuth";
import { getGymToday } from "@/lib/gymTimezone";

/**
 * POST /api/admin/staff/sessions/assign
 * Body: { session_id: string }
 * Assigns the coaching session to the current staff. Staff must be IN today. Allowed: admin, staff.
 */
export async function POST(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || !canAccessOperations(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = body.session_id;
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const today = getGymToday();
  const { data: attendance } = await supabase
    .from("staff_attendance")
    .select("status")
    .eq("staff_id", staffId)
    .eq("date", today)
    .maybeSingle();
  if (attendance?.status !== "IN") {
    return NextResponse.json({ error: "Mark yourself IN before taking sessions" }, { status: 403 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("coaching_sessions")
    .select("id, coach_id")
    .eq("id", sessionId)
    .single();
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from("coaching_sessions")
    .update({ coach_id: staffId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
