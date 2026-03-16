import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * POST /api/admin/pos/confirm
 * Body: { transaction_id }
 * Marks pending POS transaction as success and deducts inventory.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : "";
    if (!transactionId) return NextResponse.json({ error: "transaction_id required" }, { status: 400 });

    const { data: tx, error: txErr } = await supabase
      .from("pos_transactions")
      .select("id, payment_status")
      .eq("id", transactionId)
      .maybeSingle();
    if (txErr || !tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    if (tx.payment_status !== "pending") return NextResponse.json({ error: "Transaction already confirmed or failed" }, { status: 400 });

    const { data: items } = await supabase
      .from("transaction_items")
      .select("variant_id, quantity")
      .eq("transaction_id", transactionId);
    for (const it of items ?? []) {
      const vid = (it as { variant_id: string | null }).variant_id;
      if (!vid) continue;
      const { data: invRows } = await supabase.from("inventory").select("id, quantity").eq("variant_id", vid).order("quantity", { ascending: false });
      let remaining = it.quantity as number;
      for (const row of invRows ?? []) {
        if (remaining <= 0) break;
        const current = row.quantity as number;
        const deduct = Math.min(current, remaining);
        const newQty = current - deduct;
        remaining -= deduct;
        if (newQty === 0) await supabase.from("inventory").delete().eq("id", row.id);
        else await supabase.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", row.id);
      }
    }

    const { error: upErr } = await supabase
      .from("pos_transactions")
      .update({ payment_status: "success" })
      .eq("id", transactionId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
