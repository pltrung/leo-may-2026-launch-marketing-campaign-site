import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * GET /api/admin/variants/by-barcode?barcode=xxx
 * Returns variant + product for barcode-first workflow. If not found, returns 404.
 * Allowed: any admin-interface role (admin, frontdesk, staff) for POS lookup.
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: variant, error } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, size, barcode, price, cost")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!variant) return NextResponse.json({ error: "Variant not found", found: false }, { status: 404 });

  const productId = variant.product_id;

  const [{ data: product }, { data: invRows }, { data: otherVariants }] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, image").eq("id", productId).single(),
    supabase.from("inventory").select("quantity").eq("variant_id", variant.id),
    supabase.from("product_variants").select("id, sku, size, price").eq("product_id", productId),
  ]);

  const stockQuantity = (invRows ?? []).reduce((sum: number, r: { quantity: number }) => sum + (r.quantity ?? 0), 0);

  // Other sizes (same product): variants with quantity > 0, for seller to suggest alternatives
  const allVariantIds = (otherVariants ?? []).map((v: { id: string }) => v.id);
  const { data: allInvRows } = allVariantIds.length
    ? await supabase.from("inventory").select("variant_id, quantity").in("variant_id", allVariantIds)
    : { data: [] };
  const allQtyByVid: Record<string, number> = {};
  for (const r of allInvRows ?? []) {
    const vid = r.variant_id as string;
    allQtyByVid[vid] = (allQtyByVid[vid] ?? 0) + (r.quantity as number);
  }
  const other_sizes_in_stock = (otherVariants ?? [])
    .map((v: { id: string; sku: string; size: string | null; price: number }) => ({
      variant_id: v.id,
      sku: v.sku,
      size: v.size,
      price: v.price,
      quantity: allQtyByVid[v.id] ?? 0,
    }))
    .filter((row: { variant_id: string; quantity: number }) => row.variant_id !== variant.id && row.quantity > 0)
    .sort((a: { size: string | null }, b: { size: string | null }) => String(a.size ?? "").localeCompare(String(b.size ?? "")));

  return NextResponse.json({
    found: true,
    variant: {
      id: variant.id,
      product_id: variant.product_id,
      sku: variant.sku,
      size: variant.size,
      barcode: variant.barcode,
      price: variant.price,
      cost: variant.cost,
    },
    product: product ? { id: product.id, name: product.name, brand: product.brand, category: product.category, image: product.image } : null,
    stock_quantity: stockQuantity,
    other_sizes_in_stock: other_sizes_in_stock,
  });
}
