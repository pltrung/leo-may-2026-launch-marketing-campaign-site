import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

/** SKU pattern: PRODUCTCODE-SIZE e.g. SCA100-41 or code with brackets. PRODUCTCODE and SIZE can include [ ] and hyphen. */
const SKU_PATTERN = /^[A-Za-z0-9\-\[\]]+(-[A-Za-z0-9\-\[\]]+)?$/;

/**
 * POST /api/admin/variants
 * Body: { product_id, sku, size?, barcode?, price, cost? }
 * Validates SKU pattern and unique barcode.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";
    const sku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : "";
    const size = typeof body.size === "string" ? body.size.trim() || null : null;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() || null : null;
    const price = Math.max(0, parseInt(String(body.price), 10) || 0);
    const cost = Math.max(0, parseInt(String(body.cost), 10) || 0);

    if (!productId || !sku) return NextResponse.json({ error: "product_id and sku required" }, { status: 400 });
    if (!SKU_PATTERN.test(sku)) return NextResponse.json({ error: "SKU must match pattern PRODUCTCODE-SIZE (e.g. SCA100-41)" }, { status: 400 });

    if (barcode) {
      const { data: existing } = await supabase.from("product_variants").select("id").eq("barcode", barcode).maybeSingle();
      if (existing) return NextResponse.json({ error: "Barcode already registered" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku, size, barcode, price, cost })
      .select("id, product_id, sku, size, barcode, price, cost")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "SKU or barcode already exists" }, { status: 400 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ variant: data });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
