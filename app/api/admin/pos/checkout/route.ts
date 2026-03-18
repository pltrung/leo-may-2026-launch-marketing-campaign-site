import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canDoPos } from "@/lib/unifiedAdminAuth";
import { getVietQRUrl } from "@/lib/vietqr";
import { effectiveMerchDiscountPercent } from "@/lib/membershipBenefits";

const DEFAULT_COMMISSION_RATE = 0.1; // 10%

type CartItem = { sku: string; name?: string; quantity: number; price: number; variant_id?: string };

/**
 * POST /api/admin/pos/checkout
 * Body: { member_id, items: [{ sku, name?, quantity, price, variant_id? }], payment_method: "vietqr" | "cash" }
 * Resolves sku to variant_id; stores variant_id in transaction_items; deducts inventory by variant_id.
 * When caller is staff or frontdesk, attaches staff_id and commission (rate + amount).
 */
export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canDoPos(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const paymentMethod = body.payment_method === "cash" ? "cash" : "vietqr";
    const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
    if (!memberId || items.length === 0) {
      return NextResponse.json({ error: "member_id and items required" }, { status: 400 });
    }

    const { data: member } = await supabase
      .from("member_profiles")
      .select("id, merchandise_discount_percent, membership_expires_at, visits_remaining")
      .eq("id", memberId)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    let total = 0;
    const lineItems: { sku: string; name: string; quantity: number; price: number; product_id: string | null; variant_id: string | null }[] = [];
    for (const it of items) {
      const sku = typeof it.sku === "string" ? it.sku.trim() : "";
      const quantity = Math.max(1, parseInt(String(it.quantity), 10) || 1);
      const price = Math.max(0, parseInt(String(it.price), 10) || 0);
      if (!sku) continue;
      const variantId = typeof it.variant_id === "string" ? it.variant_id.trim() : null;
      let productId: string | null = null;
      let variantIdResolved = variantId;
      let productName: string | null = null;
      if (variantIdResolved) {
        const { data: v } = await supabase.from("product_variants").select("id, product_id, sku").eq("id", variantIdResolved).maybeSingle();
        if (v) {
          productId = v.product_id;
          const { data: p } = await supabase.from("products").select("name").eq("id", v.product_id).single();
          productName = p?.name ?? null;
        }
      }
      if (!variantIdResolved) {
        const { data: v } = await supabase.from("product_variants").select("id, product_id").eq("sku", sku).maybeSingle();
        if (v) {
          variantIdResolved = v.id;
          productId = v.product_id;
          const { data: p } = await supabase.from("products").select("name").eq("id", v.product_id).single();
          productName = p?.name ?? null;
        }
      }
      lineItems.push({
        sku,
        name: (typeof it.name === "string" ? it.name.trim() : null) ?? productName ?? sku,
        quantity,
        price,
        product_id: productId,
        variant_id: variantIdResolved,
      });
      total += quantity * price;
    }
    if (lineItems.length === 0) return NextResponse.json({ error: "No valid items" }, { status: 400 });

    const subtotalBeforeDiscount = total;
    const merchPct = effectiveMerchDiscountPercent({
      merchandise_discount_percent: member.merchandise_discount_percent as number | null,
      membership_expires_at: member.membership_expires_at as string | null,
      visits_remaining: member.visits_remaining as number | null,
    });
    const discountVnd = merchPct > 0 ? Math.round((subtotalBeforeDiscount * merchPct) / 100) : 0;
    total = Math.max(0, subtotalBeforeDiscount - discountVnd);

    const status = paymentMethod === "cash" ? "success" : "pending";
    const memo = paymentMethod === "vietqr" ? `LM_PURCHASE:${lineItems.map((i) => i.sku).join(",")}` : null;

    const staffId = unified.staffId ?? null;
    const commissionRate = staffId ? DEFAULT_COMMISSION_RATE : null;
    const commissionAmount = staffId && commissionRate != null ? Math.round(total * commissionRate) : null;

    const { data: tx, error: txErr } = await supabase
      .from("pos_transactions")
      .insert({
        member_id: memberId,
        staff_id: staffId,
        total,
        payment_method: paymentMethod,
        payment_status: status,
        memo,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        subtotal_before_discount_vnd: subtotalBeforeDiscount,
        member_merch_discount_percent: merchPct > 0 ? merchPct : null,
      })
      .select("id")
      .single();
    if (txErr || !tx) return NextResponse.json({ error: txErr?.message ?? "Failed to create transaction" }, { status: 500 });

    for (const it of lineItems) {
      await supabase.from("transaction_items").insert({
        transaction_id: tx.id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      });
    }

    if (paymentMethod === "cash" && lineItems.some((i) => i.variant_id)) {
      for (const it of lineItems) {
        if (!it.variant_id) continue;
        const { data: invRows } = await supabase.from("inventory").select("id, quantity").eq("variant_id", it.variant_id).order("quantity", { ascending: false });
        let remaining = it.quantity;
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
      return NextResponse.json({
        ok: true,
        transaction_id: tx.id,
        subtotal_before_discount_vnd: subtotalBeforeDiscount,
        member_merch_discount_percent: merchPct > 0 ? merchPct : null,
        discount_vnd: discountVnd,
        total,
      });
    }

    const url = getVietQRUrl(total, memo ?? "");
    return NextResponse.json({
      ok: true,
      transaction_id: tx.id,
      url,
      memo,
      total,
      subtotal_before_discount_vnd: subtotalBeforeDiscount,
      member_merch_discount_percent: merchPct > 0 ? merchPct : null,
      discount_vnd: discountVnd,
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
