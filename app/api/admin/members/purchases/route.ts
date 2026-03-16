import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/members/purchases?member_id=xxx
 * Returns POS purchase history for the member (for display in member profile).
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("member_id")?.trim();
  if (!memberId) return NextResponse.json({ error: "member_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: txList, error: txErr } = await supabase
    .from("pos_transactions")
    .select("id, total, payment_method, payment_status, created_at")
    .eq("member_id", memberId)
    .eq("payment_status", "success")
    .order("created_at", { ascending: false })
    .limit(50);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const out: { id: string; total: number; payment_method: string; created_at: string; items: { sku: string; name: string | null; quantity: number; price: number }[] }[] = [];
  for (const tx of txList ?? []) {
    const { data: items } = await supabase
      .from("transaction_items")
      .select("sku, name, quantity, price")
      .eq("transaction_id", tx.id);
    out.push({
      id: tx.id,
      total: tx.total as number,
      payment_method: tx.payment_method as string,
      created_at: tx.created_at as string,
      items: (items ?? []).map((i) => ({
        sku: i.sku,
        name: i.name ?? null,
        quantity: i.quantity as number,
        price: i.price as number,
      })),
    });
  }
  return NextResponse.json({ purchases: out });
}
