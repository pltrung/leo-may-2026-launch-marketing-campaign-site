import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessInventory } from "@/lib/unifiedAdminAuth";

const CATEGORIES = ["shoes", "chalk", "merch", "rental"] as const;
/** Product code / SKU: alphanumeric, hyphen, brackets (e.g. from barcode scans). */
const CODE_PATTERN = /^[A-Za-z0-9\-\[\]]+$/;

/**
 * POST /api/admin/products/with-variants
 * Create product and variants in one call (barcode-first "Create Product" flow).
 * If variant.quantity is provided and > 0, creates initial inventory so the product appears in View Inventory.
 * Body: { name, brand?, category, image?, product_code, variants: [{ size?, barcode?, price, cost?, quantity? }] }
 * SKU = product_code + (size ? "-" + size : "")
 */
export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessInventory(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const brand = typeof body.brand === "string" ? body.brand.trim() || null : null;
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    const image = typeof body.image === "string" ? body.image.trim() || null : null;
    const productCode = typeof body.product_code === "string" ? body.product_code.trim().toUpperCase() : "";
    const variants = Array.isArray(body.variants) ? body.variants : [];

    if (!name || !category) return NextResponse.json({ error: "name and category required" }, { status: 400 });
    if (!productCode || !CODE_PATTERN.test(productCode)) return NextResponse.json({ error: "product_code required (letters, numbers, hyphen, [ ] allowed)" }, { status: 400 });
    if (variants.length === 0) return NextResponse.json({ error: "At least one variant required" }, { status: 400 });

    const barcodes = new Set<string>();
    for (const v of variants) {
      const b = typeof v.barcode === "string" ? v.barcode.trim() : null;
      if (b) {
        if (barcodes.has(b)) return NextResponse.json({ error: "Duplicate barcode in variants" }, { status: 400 });
        barcodes.add(b);
      }
    }

    const { data: product, error: productErr } = await supabase
      .from("products")
      .insert({ name, brand, category, image })
      .select("id")
      .single();

    if (productErr || !product) return NextResponse.json({ error: productErr?.message ?? "Failed to create product" }, { status: 500 });

    for (const v of variants) {
      const size = typeof v.size === "string" ? v.size.trim() || null : null;
      const barcode = typeof v.barcode === "string" ? v.barcode.trim() || null : null;
      const price = Math.max(0, parseInt(String(v.price), 10) || 0);
      const cost = Math.max(0, parseInt(String(v.cost), 10) || 0);
      const quantity = Math.max(0, parseInt(String(v.quantity), 10) || 0);
      const sku = size ? `${productCode}-${size}` : productCode;

      if (barcode) {
        const { data: ex } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
        if (ex) {
          await supabase.from("products").delete().eq("id", product.id);
          return NextResponse.json({ error: "Barcode already registered: " + barcode }, { status: 400 });
        }
      }

      const { data: insertedVariant, error: varErr } = await supabase
        .from("product_variants")
        .insert({ product_id: product.id, sku, size, barcode, price, cost })
        .select("id")
        .single();

      if (varErr || !insertedVariant) {
        await supabase.from("products").delete().eq("id", product.id);
        return NextResponse.json({ error: varErr?.message ?? "Failed to create variant" }, { status: 500 });
      }

      if (quantity > 0) {
        const { error: invErr } = await supabase.from("inventory").insert({ variant_id: insertedVariant.id, quantity, location: null });
        if (invErr) {
          await supabase.from("products").delete().eq("id", product.id);
          return NextResponse.json({ error: invErr.message + ". Run migration 031_product_variants_barcode_first.sql if needed." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ product: { id: product.id, name, brand, category, image }, variants_created: variants.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isDbError = /relation|column|syntax|migration|does not exist/i.test(message);
    const hint = " Run migration 031_product_variants_barcode_first.sql on your database (Supabase SQL Editor or migrations) if you have not.";
    return NextResponse.json(
      { error: message + (isDbError ? hint : ". Check server logs for details.") },
      { status: 500 }
    );
  }
}
