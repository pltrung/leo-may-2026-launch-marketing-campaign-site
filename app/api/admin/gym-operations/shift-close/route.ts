import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireDeskStaff } from "@/lib/gymOperationsAdminAuth";
import { insertAdminAuditLog } from "@/lib/auditLog";
import { getGymToday } from "@/lib/gymTimezone";

export async function GET(req: NextRequest) {
  const auth = await requireDeskStaff(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const limit = Math.min(60, Math.max(5, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
  const { data, error } = await supabase
    .from("pos_shift_closes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({ closes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireDeskStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const gymDate = typeof body.gym_date === "string" && body.gym_date ? body.gym_date.trim() : getGymToday();
  const cashExpected =
    typeof body.cash_expected_vnd === "number" ? Math.round(body.cash_expected_vnd) : 0;
  const cashCounted =
    typeof body.cash_counted_vnd === "number" ? Math.round(body.cash_counted_vnd) : 0;
  const varianceNotes = typeof body.variance_notes === "string" ? body.variance_notes.trim() || null : null;
  const digitalSalesNote =
    typeof body.digital_sales_note === "string" ? body.digital_sales_note.trim() || null : null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("pos_shift_closes")
    .insert({
      closed_by_staff_id: auth.u.staffId,
      gym_date: gymDate,
      cash_expected_vnd: cashExpected,
      cash_counted_vnd: cashCounted,
      variance_notes: varianceNotes,
      digital_sales_note: digitalSalesNote,
    })
    .select("id")
    .single();

  if (error) {
    console.error("pos_shift_closes insert", error);
    return NextResponse.json({ error: "Failed to save shift close" }, { status: 500 });
  }

  await insertAdminAuditLog(supabase, {
    staffId: auth.u.staffId,
    adminAuthId: auth.u.user.id,
    actionType: "shift_close",
    entityId: data?.id ?? null,
    metadata: { gym_date: gymDate, cash_expected_vnd: cashExpected, cash_counted_vnd: cashCounted },
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
