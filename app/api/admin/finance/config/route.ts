import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: row } = await supabase.from("finance_config").select("id").limit(1).maybeSingle();
  const id = (row as { id: string } | null)?.id;
  if (!id) return NextResponse.json({ error: "No finance config" }, { status: 500 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.rent_amount != null) patch.rent_amount = Math.max(0, Number(body.rent_amount));
  if (body.current_cash != null) patch.current_cash = Number(body.current_cash);
  if (body.rent_due_day != null) {
    const d = Math.min(28, Math.max(1, Number(body.rent_due_day)));
    patch.rent_due_day = d;
  }
  if (body.payroll_day != null) {
    const d = Math.min(28, Math.max(1, Number(body.payroll_day)));
    patch.payroll_day = d;
  }

  const { error } = await supabase.from("finance_config").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
