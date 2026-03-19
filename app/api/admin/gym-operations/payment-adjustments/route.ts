import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/gymOperationsAdminAuth";
import { insertAdminAuditLog } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const limit = Math.min(100, Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") ?? "40", 10) || 40));
  const { data, error } = await supabase
    .from("payment_adjustments")
    .select("id, member_id, payment_id, amount_vnd, reason, created_at, recorded_by_staff_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("payment_adjustments list", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
  return NextResponse.json({ adjustments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const amountVnd = typeof body.amount_vnd === "number" ? Math.round(body.amount_vnd) : NaN;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const paymentId = typeof body.payment_id === "string" && body.payment_id ? body.payment_id.trim() : null;
  if (!memberId || !reason || !Number.isFinite(amountVnd) || amountVnd === 0) {
    return NextResponse.json({ error: "member_id, non-zero amount_vnd, and reason required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: inserted, error } = await supabase
    .from("payment_adjustments")
    .insert({
      member_id: memberId,
      payment_id: paymentId,
      amount_vnd: amountVnd,
      reason,
      recorded_by_staff_id: auth.u.staffId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("payment_adjustments insert", error);
    return NextResponse.json({ error: "Failed to record adjustment" }, { status: 500 });
  }

  await insertAdminAuditLog(supabase, {
    staffId: auth.u.staffId,
    adminAuthId: auth.u.user.id,
    actionType: "payment_adjustment",
    entityId: inserted?.id ?? memberId,
    metadata: { amount_vnd: amountVnd, member_id: memberId },
  });

  return NextResponse.json({ ok: true, id: inserted?.id });
}
