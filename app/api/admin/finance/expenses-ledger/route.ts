/** GET ledger for audit: ?month=YYYY-MM or ?from=&to= */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { getGymMonthBoundaries } from "@/lib/gymTimezone";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month")?.trim();
  const from = url.searchParams.get("from")?.trim();
  const to = url.searchParams.get("to")?.trim();

  const supabase = createServerClient();
  let q = supabase
    .from("expenses")
    .select(
      "id, expense_date, category, item_name, quantity, cost, notes, reorder_request_id, created_at, created_by_staff_id, status, paid_at"
    )
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const { start, end } = getGymMonthBoundaries(y, m);
    q = q.gte("expense_date", start).lte("expense_date", end);
  } else if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    q = q.gte("expense_date", from).lte("expense_date", to);
  }

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  const ids = Array.from(
    new Set(
      (rows ?? [])
        .map((r: { created_by_staff_id: string | null }) => r.created_by_staff_id)
        .filter((x): x is string => !!x)
    )
  );
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: staff } = await supabase.from("staff_profiles").select("id, display_name, email").in("id", ids);
    for (const s of staff ?? []) {
      const row = s as { id: string; display_name: string | null; email: string };
      names[row.id] = row.display_name || row.email;
    }
  }

  return NextResponse.json({
    expenses: (rows ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      created_by_name: e.created_by_staff_id ? names[String(e.created_by_staff_id)] ?? null : null,
    })),
  });
}
