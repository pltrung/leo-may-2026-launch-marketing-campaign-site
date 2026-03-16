import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/variants/by-barcode?barcode=xxx
 * Returns variant + product for barcode-first workflow. If not found, returns 404.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const [{ data: product }, { data: invRows }] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, image").eq("id", variant.product_id).single(),
    supabase.from("inventory").select("quantity").eq("variant_id", variant.id),
  ]);

  const stockQuantity = (invRows ?? []).reduce((sum: number, r: { quantity: number }) => sum + (r.quantity ?? 0), 0);

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
  });
}
