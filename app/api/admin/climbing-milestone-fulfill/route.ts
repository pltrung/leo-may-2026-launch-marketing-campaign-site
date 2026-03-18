/**
 * POST /api/admin/climbing-milestone-fulfill
 * Mark merch (cap/shirt/shoes) as picked up at front desk.
 * Body: { member_id, milestone_visits: 50 | 100 | 250 }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, canDoCheckIn } from "@/lib/unifiedAdminAuth";
import { createServerClient } from "@/lib/supabaseServer";
import { getStaffIdFromAuthId } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canDoCheckIn(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { member_id?: string; milestone_visits?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const mv = body.milestone_visits;
  if (!memberId || ![50, 100, 250].includes(mv as number)) {
    return NextResponse.json({ error: "member_id and milestone_visits (50, 100, or 250) required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const staffId =
    unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id)) ?? null;

  const { data: row, error: selErr } = await supabase
    .from("member_climbing_merch_rewards")
    .select("id, fulfilled_at")
    .eq("member_id", memberId)
    .eq("milestone_visits", mv)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.json({ error: "No merch reward for this milestone (member may not have reached it yet)" }, { status: 404 });
  }
  if (row.fulfilled_at) {
    return NextResponse.json({ error: "Already marked as picked up", status: "already_fulfilled" }, { status: 400 });
  }

  const { error: updErr } = await supabase
    .from("member_climbing_merch_rewards")
    .update({
      fulfilled_at: new Date().toISOString(),
      fulfilled_by_staff_id: staffId,
    })
    .eq("id", row.id);

  if (updErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
