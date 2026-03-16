import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

const CATEGORIES = ["shoes", "chalk", "merch", "rental"] as const;

/**
 * GET /api/admin/products/[id]
 * Returns a single product with all variants and stock quantity per variant.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: product, error: productErr } = await supabase
    .from("products")
    .select("id, name, brand, category, image")
    .eq("id", id)
    .single();

  if (productErr || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { data: variants, error: varErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, size, barcode, price, cost")
    .eq("product_id", id)
    .order("sku");

  if (varErr) {
    return NextResponse.json({ error: varErr.message }, { status: 500 });
  }

  const variantIds = (variants ?? []).map((v: { id: string }) => v.id);
  const { data: invRows } =
    variantIds.length > 0
      ? await supabase
          .from("inventory")
          .select("variant_id, quantity")
          .in("variant_id", variantIds)
      : { data: [] };

  const qtyByVariant: Record<string, number> = {};
  for (const r of invRows ?? []) {
    const vid = r.variant_id as string;
    qtyByVariant[vid] = (qtyByVariant[vid] ?? 0) + (r.quantity as number);
  }

  const variantsWithStock = (variants ?? []).map(
    (v: { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number }) => ({
      ...v,
      stock_quantity: qtyByVariant[v.id] ?? 0,
    })
  );

  return NextResponse.json({
    product,
    variants: variantsWithStock,
  });
}

/**
 * PATCH /api/admin/products/[id]
 * Body: { name?, brand?, category?, image? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const supabase = createServerClient();
  try {
    const body = await req.json();
    const updates: { name?: string; brand?: string | null; category?: string; image?: string | null } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (name) updates.name = name;
    }
    if (body.brand !== undefined) {
      updates.brand = typeof body.brand === "string" ? body.brand.trim() || null : null;
    }
    if (CATEGORIES.includes(body.category)) {
      updates.category = body.category;
    }
    if (body.image !== undefined) {
      updates.image = typeof body.image === "string" ? body.image.trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("id, name, brand, category, image")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
