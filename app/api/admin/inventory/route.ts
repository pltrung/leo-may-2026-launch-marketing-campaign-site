import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessInventory } from "@/lib/unifiedAdminAuth";
import { insertAdminAuditLog, getStaffIdFromAuthId } from "@/lib/auditLog";

const CATEGORIES = ["shoes", "chalk", "merch", "rental"] as const;

/**
 * GET /api/admin/inventory
 * GET /api/admin/inventory?variant_id=xxx
 * GET /api/admin/inventory?category=shoes|chalk|merch|rental
 * Returns all product variants with their stock (quantity). Variants with no inventory row show quantity 0
 * so newly created products appear in View Inventory.
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessInventory(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const variantIdParam = req.nextUrl.searchParams.get("variant_id")?.trim();
  const categoryParam = req.nextUrl.searchParams.get("category")?.trim().toLowerCase();

  const { data: allVariants, error: varErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, size, barcode, price, cost")
    .order("sku");
  if (varErr) return NextResponse.json({ error: varErr.message }, { status: 500 });

  let variants = allVariants ?? [];
  if (variantIdParam) variants = variants.filter((v: { id: string }) => v.id === variantIdParam);

  const vIds = variants.map((v: { id: string }) => v.id);
  const { data: invRows } = vIds.length
    ? await supabase.from("inventory").select("variant_id, quantity").in("variant_id", vIds)
    : { data: [] };

  const qtyByVariant: Record<string, number> = {};
  for (const r of invRows ?? []) {
    const vid = r.variant_id as string;
    qtyByVariant[vid] = (qtyByVariant[vid] ?? 0) + (r.quantity as number);
  }

  const pIds = Array.from(new Set(variants.map((v: { product_id: string }) => v.product_id)));
  const { data: products } = pIds.length
    ? await supabase.from("products").select("id, name, brand, category, image").in("id", pIds)
    : { data: [] };
  const productMap = (products ?? []).reduce((acc: Record<string, unknown>, p: { id: string }) => {
    acc[p.id] = p;
    return acc;
  }, {});

  let inventory = variants.map((v: { id: string; product_id: string }) => ({
    id: v.id,
    variant_id: v.id,
    quantity: qtyByVariant[v.id] ?? 0,
    location: null as string | null,
    variant: v,
    product: productMap[v.product_id] ?? null,
  }));

  if (categoryParam && CATEGORIES.includes(categoryParam as (typeof CATEGORIES)[number])) {
    inventory = inventory.filter((inv: { product: { category?: string } | null }) => inv.product?.category === categoryParam);
  }

  return NextResponse.json({ inventory });
}

/**
 * POST /api/admin/inventory - Stock in
 * Body: { variant_id, barcode, or sku (barcode field tries barcode then SKU), quantity, location? }
 */
export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessInventory(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let variantId = typeof body.variant_id === "string" ? body.variant_id.trim() : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);
    const location = typeof body.location === "string" ? body.location.trim() || null : null;

    if (!variantId && barcode) {
      const { data: vByBarcode } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
      variantId = vByBarcode?.id ?? null;
      if (!variantId) {
        const { data: vBySku } = await supabase.from("product_variants").select("id").eq("sku", barcode).maybeSingle();
        variantId = vBySku?.id ?? null;
      }
    }
    if (!variantId) return NextResponse.json({ error: "Variant not found (variant_id, barcode, or SKU required)" }, { status: 400 });

    const locKey = location ?? "";
    let existingQuery = supabase.from("inventory").select("id, quantity").eq("variant_id", variantId);
    if (locKey) existingQuery = existingQuery.eq("location", locKey);
    else existingQuery = existingQuery.is("location", null);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      const newQty = (existing.quantity as number) + quantity;
      await supabase.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", existing.id);
      const auditStaffId = unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id));
      await insertAdminAuditLog(supabase, { adminAuthId: unified.user.id, staffId: auditStaffId, actionType: "inventory_stock_in", entityId: variantId, metadata: { quantity: newQty } });
      return NextResponse.json({ ok: true, quantity: newQty });
    }
    const { data: inserted, error: insErr } = await supabase
      .from("inventory")
      .insert({ variant_id: variantId, quantity, location })
      .select("id, quantity")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    const auditStaffId = unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id));
    await insertAdminAuditLog(supabase, { adminAuthId: unified.user.id, staffId: auditStaffId, actionType: "inventory_stock_in", entityId: variantId, metadata: { quantity: inserted?.quantity ?? quantity } });
    return NextResponse.json({ ok: true, quantity: inserted?.quantity ?? quantity });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/inventory - Stock out
 * Body: { variant_id, barcode, or sku (barcode field tries barcode then SKU), quantity }
 */
export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessInventory(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let variantId = typeof body.variant_id === "string" ? body.variant_id.trim() : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);

    if (!variantId && barcode) {
      const { data: vByBarcode } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
      variantId = vByBarcode?.id ?? null;
      if (!variantId) {
        const { data: vBySku } = await supabase.from("product_variants").select("id").eq("sku", barcode).maybeSingle();
        variantId = vBySku?.id ?? null;
      }
    }
    if (!variantId) return NextResponse.json({ error: "Variant not found (variant_id, barcode, or SKU required)" }, { status: 400 });

    const { data: rows } = await supabase.from("inventory").select("id, quantity").eq("variant_id", variantId).order("quantity", { ascending: false });
    if (!rows?.length) return NextResponse.json({ error: "No inventory row for this variant" }, { status: 404 });

    let remaining = quantity;
    for (const row of rows) {
      if (remaining <= 0) break;
      const current = row.quantity as number;
      const deduct = Math.min(current, remaining);
      const newQty = current - deduct;
      remaining -= deduct;
      if (newQty === 0) await supabase.from("inventory").delete().eq("id", row.id);
      else await supabase.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", row.id);
    }
    if (remaining > 0) return NextResponse.json({ error: "Insufficient quantity" }, { status: 400 });
    const auditStaffId = unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id));
    await insertAdminAuditLog(supabase, { adminAuthId: unified.user.id, staffId: auditStaffId, actionType: "inventory_stock_out", entityId: variantId, metadata: { quantity } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
