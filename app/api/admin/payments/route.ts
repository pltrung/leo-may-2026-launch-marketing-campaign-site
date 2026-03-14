import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * GET ?member_id=xxx - list recent payments for a member
 */
export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("member_id")?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "member_id required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, plan_id, amount, method, status, memo, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("payments list error", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
  const planNames: Record<string, string> = {
    day_pass: "Day Pass",
    month_pass: "Month Pass",
    year_pass: "Year Pass",
    newbie_class: "Newbie Class",
  };
  const payments = (data ?? []).map((p) => ({
    id: p.id,
    plan_id: p.plan_id,
    plan_name: planNames[p.plan_id as string] ?? p.plan_id,
    amount: p.amount,
    method: p.method,
    status: p.status,
    memo: p.memo,
    created_at: p.created_at,
  }));
  return NextResponse.json({ payments }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
