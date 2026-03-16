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
      .select("product_id, quantity")
      .eq("transaction_id", transactionId);
    for (const it of items ?? []) {
      if (!it.product_id) continue;
      const { data: inv } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("product_id", it.product_id)
        .or("size.is.null")
        .maybeSingle();
      if (inv && (inv.quantity as number) >= (it.quantity as number)) {
        await supabase
          .from("inventory")
          .update({
            quantity: (inv.quantity as number) - (it.quantity as number),
            updated_at: new Date().toISOString(),
          })
          .eq("id", inv.id);
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
