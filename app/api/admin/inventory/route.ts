import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/inventory
 * GET /api/admin/inventory?variant_id=xxx
 * Returns inventory rows with variant + product info.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const variantId = req.nextUrl.searchParams.get("variant_id")?.trim();

  let query = supabase
    .from("inventory")
    .select("id, variant_id, quantity, location")
    .order("variant_id");

  if (variantId) query = query.eq("variant_id", variantId);
  const { data: invRows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = invRows ?? [];
  const vIds = Array.from(new Set(rows.map((r: { variant_id: string }) => r.variant_id)));
  const { data: variants } = vIds.length
    ? await supabase.from("product_variants").select("id, product_id, sku, size, barcode, price, cost").in("id", vIds)
    : { data: [] };
  const pIds = Array.from(new Set((variants ?? []).map((v: { product_id: string }) => v.product_id)));
  const { data: products } = pIds.length
    ? await supabase.from("products").select("id, name, brand, category, image").in("id", pIds)
    : { data: [] };
  const variantMap = (variants ?? []).reduce((acc: Record<string, unknown>, v: { id: string }) => {
    acc[v.id] = v;
    return acc;
  }, {});
  const productMap = (products ?? []).reduce((acc: Record<string, unknown>, p: { id: string }) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const inventory = rows.map((r: { variant_id: string; [k: string]: unknown }) => {
    const v = variantMap[r.variant_id] as { product_id: string } | undefined;
    const product = v ? productMap[v.product_id] : null;
    return { ...r, variant: v ?? null, product: product ?? null };
  });

  return NextResponse.json({ inventory });
}

/**
 * POST /api/admin/inventory - Stock in
 * Body: { variant_id or barcode, quantity, location? }
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let variantId = typeof body.variant_id === "string" ? body.variant_id.trim() : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);
    const location = typeof body.location === "string" ? body.location.trim() || null : null;

    if (!variantId && barcode) {
      const { data: v } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
      variantId = v?.id ?? null;
    }
    if (!variantId) return NextResponse.json({ error: "Variant not found (variant_id or barcode required)" }, { status: 400 });

    const locKey = location ?? "";
    let existingQuery = supabase.from("inventory").select("id, quantity").eq("variant_id", variantId);
    if (locKey) existingQuery = existingQuery.eq("location", locKey);
    else existingQuery = existingQuery.is("location", null);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      const newQty = (existing.quantity as number) + quantity;
      await supabase.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", existing.id);
      return NextResponse.json({ ok: true, quantity: newQty });
    }
    const { data: inserted, error: insErr } = await supabase
      .from("inventory")
      .insert({ variant_id: variantId, quantity, location })
      .select("id, quantity")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, quantity: inserted?.quantity ?? quantity });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/inventory - Stock out
 * Body: { variant_id or barcode, quantity }
 */
export async function PATCH(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let variantId = typeof body.variant_id === "string" ? body.variant_id.trim() : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);

    if (!variantId && barcode) {
      const { data: v } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
      variantId = v?.id ?? null;
    }
    if (!variantId) return NextResponse.json({ error: "Variant not found" }, { status: 400 });

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
