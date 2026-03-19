/**
 * PATCH /api/admin/finance/expense-paid?id=uuid
 * Mark expense as paid or pending.
 * Body: { paid: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { paid?: boolean };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const paid = body.paid === true;

  const supabase = createServerClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      status: paid ? "paid" : "pending",
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json(
        { error: "Run migration 066 to add expense payment columns" },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
