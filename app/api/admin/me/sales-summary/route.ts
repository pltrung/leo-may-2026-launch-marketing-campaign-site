import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";

/**
 * GET /api/admin/me/sales-summary
 * Returns sales_today (total VND) and commission_today (VND) for the current staff member.
 * Only returns data when the caller has a staffId (staff or frontdesk with staff_profiles row).
 * Admin with no staff_profiles row gets zeros.
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staffId = unified.staffId ?? null;
  if (!staffId) {
    return NextResponse.json({ sales_today: 0, commission_today: 0 });
  }

  const today = getGymToday();
  const startOfDay = getGymStartOfDay(today);
  const endOfDay = getGymEndOfDay(today);

  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("pos_transactions")
    .select("total, commission_amount, created_at")
    .eq("staff_id", staffId)
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .in("payment_status", ["success", "pending"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sales_today = 0;
  let commission_today = 0;
  for (const row of rows ?? []) {
    sales_today += (row.total as number) ?? 0;
    commission_today += (row.commission_amount as number) ?? 0;
  }

  return NextResponse.json({ sales_today, commission_today });
}
