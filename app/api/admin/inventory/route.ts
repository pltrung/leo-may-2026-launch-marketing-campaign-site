import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/inventory
 * GET /api/admin/inventory?product_id=xxx
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const productId = req.nextUrl.searchParams.get("product_id")?.trim();

  let query = supabase
    .from("inventory")
    .select("id, product_id, size, quantity, location, products(id, name, sku, category)")
    .order("product_id");

  if (productId) query = query.eq("product_id", productId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inventory: data ?? [] });
}

/**
 * POST /api/admin/inventory/stock-in
 * Body: { product_id or sku or barcode, quantity, size?, location?, price_override? }
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let productId = typeof body.product_id === "string" ? body.product_id.trim() : null;
    const sku = typeof body.sku === "string" ? body.sku.trim() : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);
    const size = typeof body.size === "string" ? body.size.trim() || null : null;
    const location = typeof body.location === "string" ? body.location.trim() || null : null;

    if (!productId && sku) {
      const { data: p } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      productId = p?.id ?? null;
    }
    if (!productId && barcode) {
      const { data: p } = await supabase.from("products").select("id").eq("barcode", barcode).maybeSingle();
      productId = p?.id ?? null;
    }
    if (!productId) return NextResponse.json({ error: "Product not found (product_id, sku, or barcode required)" }, { status: 400 });

    const sizeKey = size ?? "";
    const { data: existing } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("product_id", productId)
      .or(sizeKey ? `size.eq.${sizeKey}` : "size.is.null")
      .maybeSingle();

    if (existing) {
      const newQty = (existing.quantity as number) + quantity;
      const { error: upErr } = await supabase
        .from("inventory")
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, quantity: newQty });
    }
    const { data: inserted, error: insErr } = await supabase
      .from("inventory")
      .insert({ product_id: productId, size: sizeKey || null, quantity, location })
      .select("id, quantity")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, quantity: inserted?.quantity ?? quantity });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/inventory - Stock out (reduce quantity)
 * Body: { product_id or sku, quantity (to deduct), size? }
 */
export async function PATCH(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    let productId = typeof body.product_id === "string" ? body.product_id.trim() : null;
    const sku = typeof body.sku === "string" ? body.sku.trim() : null;
    const quantity = Math.max(1, parseInt(String(body.quantity), 10) || 1);
    const size = typeof body.size === "string" ? body.size.trim() || null : null;

    if (!productId && sku) {
      const { data: p } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      productId = p?.id ?? null;
    }
    if (!productId) return NextResponse.json({ error: "Product not found" }, { status: 400 });

    const sizeKey = size ?? "";
    const { data: row } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("product_id", productId)
      .or(sizeKey ? `size.eq.${sizeKey}` : "size.is.null")
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "No inventory row found" }, { status: 404 });
    const current = row.quantity as number;
    if (current < quantity) return NextResponse.json({ error: "Insufficient quantity" }, { status: 400 });
    const newQty = current - quantity;
    const { error: upErr } = await supabase
      .from("inventory")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, quantity: newQty });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
