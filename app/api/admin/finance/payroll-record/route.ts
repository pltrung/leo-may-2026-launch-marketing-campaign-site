import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { month_key?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const month_key = String(body.month_key || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month_key)) {
    return NextResponse.json({ error: "month_key required" }, { status: 400 });
  }
  const status = body.status === "paid" ? "paid" : body.status === "pending" ? "pending" : null;
  if (!status) return NextResponse.json({ error: "status paid|pending" }, { status: 400 });

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: ex } = await supabase
    .from("payroll_records")
    .select("id, total_amount")
    .eq("month_key", month_key)
    .maybeSingle();

  if (ex) {
    const { error } = await supabase
      .from("payroll_records")
      .update({
        status,
        paid_at: status === "paid" ? now : null,
        updated_at: now,
      })
      .eq("id", (ex as { id: string }).id);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } else {
    const { error } = await supabase.from("payroll_records").insert({
      month_key,
      total_amount: 0,
      status,
      paid_at: status === "paid" ? now : null,
    });
    if (error) return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
