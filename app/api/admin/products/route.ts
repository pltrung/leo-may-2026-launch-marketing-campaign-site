import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessInventory } from "@/lib/unifiedAdminAuth";

const CATEGORIES = ["shoes", "chalk", "merch", "rental"] as const;

/**
 * GET /api/admin/products
 * GET /api/admin/products?sku=xxx  -> returns product + matching variant(s)
 * GET /api/admin/products?barcode=xxx -> returns product + matching variant (for lookup)
 * Allowed: any admin-interface role (admin, frontdesk, staff) for lookup/POS.
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const sku = req.nextUrl.searchParams.get("sku")?.trim();
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();

  if (barcode) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id, product_id, sku, size, barcode, price, cost")
      .eq("barcode", barcode)
      .maybeSingle();
    if (!variant) return NextResponse.json({ product: null, variant: null, stock_quantity: 0 });
    const [{ data: product }, { data: invRows }] = await Promise.all([
      supabase.from("products").select("id, name, brand, category, image").eq("id", variant.product_id).single(),
      supabase.from("inventory").select("quantity").eq("variant_id", variant.id),
    ]);
    const stock_quantity = (invRows ?? []).reduce((s: number, r: { quantity: number }) => s + (r.quantity ?? 0), 0);
    return NextResponse.json({ product, variant, stock_quantity });
  }

  if (sku) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id, product_id, sku, size, barcode, price, cost")
      .eq("sku", sku)
      .maybeSingle();
    if (!variant) return NextResponse.json({ product: null, variant: null, stock_quantity: 0 });
    const [{ data: product }, { data: invRows }] = await Promise.all([
      supabase.from("products").select("id, name, brand, category, image").eq("id", variant.product_id).single(),
      supabase.from("inventory").select("quantity").eq("variant_id", variant.id),
    ]);
    const stock_quantity = (invRows ?? []).reduce((s: number, r: { quantity: number }) => s + (r.quantity ?? 0), 0);
    return NextResponse.json({ product, variant, stock_quantity });
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, category, image")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: allVariants } = await supabase.from("product_variants").select("id, product_id, sku, size, barcode, price, cost");
  const byProduct = (allVariants ?? []).reduce((acc: Record<string, { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number }[]>, v: { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number }) => {
    const arr = acc[v.product_id] ?? [];
    arr.push(v);
    acc[v.product_id] = arr;
    return acc;
  }, {} as Record<string, { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number }[]>);

  const withVariants = (products ?? []).map((p) => ({ ...p, variants: byProduct[p.id] ?? [] }));
  return NextResponse.json({ products: withVariants });
}

/**
 * POST /api/admin/products - Create product only (no variants)
 * Body: { name, brand?, category, image? }
 * Allowed: admin, frontdesk (inventory).
 */
export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessInventory(unified.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const brand = typeof body.brand === "string" ? body.brand.trim() || null : null;
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    const image = typeof body.image === "string" ? body.image.trim() || null : null;

    if (!name || !category) return NextResponse.json({ error: "name and category required" }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .insert({ name, brand, category, image })
      .select("id, name, brand, category, image")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
