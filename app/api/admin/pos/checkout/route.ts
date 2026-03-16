import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getVietQRUrl } from "@/lib/vietqr";

type CartItem = { sku: string; name?: string; quantity: number; price: number };

/**
 * POST /api/admin/pos/checkout
 * Body: { member_id, items: [{ sku, name?, quantity, price }], payment_method: "vietqr" | "cash" }
 * Cash: create transaction success, deduct inventory, return { ok: true }.
 * VietQR: create transaction pending, return { url, memo, transaction_id } for QR display; staff confirms later via /pos/confirm.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const paymentMethod = body.payment_method === "cash" ? "cash" : "vietqr";
    const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
    if (!memberId || items.length === 0) {
      return NextResponse.json({ error: "member_id and items required" }, { status: 400 });
    }

    const { data: member } = await supabase.from("member_profiles").select("id").eq("id", memberId).maybeSingle();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    let total = 0;
    const lineItems: { sku: string; name: string; quantity: number; price: number; product_id: string | null }[] = [];
    for (const it of items) {
      const sku = typeof it.sku === "string" ? it.sku.trim() : "";
      const quantity = Math.max(1, parseInt(String(it.quantity), 10) || 1);
      const price = Math.max(0, parseInt(String(it.price), 10) || 0);
      if (!sku) continue;
      const { data: product } = await supabase.from("products").select("id, name").eq("sku", sku).maybeSingle();
      lineItems.push({
        sku,
        name: (typeof it.name === "string" ? it.name.trim() : null) ?? (product?.name as string) ?? sku,
        quantity,
        price,
        product_id: product?.id ?? null,
      });
      total += quantity * price;
    }
    if (lineItems.length === 0) return NextResponse.json({ error: "No valid items" }, { status: 400 });

    const status = paymentMethod === "cash" ? "success" : "pending";
    const memo = paymentMethod === "vietqr" ? `LM_PURCHASE:${lineItems.map((i) => i.sku).join(",")}` : null;

    const { data: tx, error: txErr } = await supabase
      .from("pos_transactions")
      .insert({
        member_id: memberId,
        total,
        payment_method: paymentMethod,
        payment_status: status,
        memo,
      })
      .select("id")
      .single();
    if (txErr || !tx) return NextResponse.json({ error: txErr?.message ?? "Failed to create transaction" }, { status: 500 });

    for (const it of lineItems) {
      await supabase.from("transaction_items").insert({
        transaction_id: tx.id,
        product_id: it.product_id,
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      });
    }

    if (paymentMethod === "cash") {
      for (const it of lineItems) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("product_id", it.product_id)
          .or("size.is.null")
          .maybeSingle();
        if (inv && (inv.quantity as number) >= it.quantity) {
          await supabase
            .from("inventory")
            .update({ quantity: (inv.quantity as number) - it.quantity, updated_at: new Date().toISOString() })
            .eq("id", inv.id);
        }
      }
      return NextResponse.json({ ok: true, transaction_id: tx.id });
    }

    const url = getVietQRUrl(total, memo ?? "");
    return NextResponse.json({ ok: true, transaction_id: tx.id, url, memo, total });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
