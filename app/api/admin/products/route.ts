import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

const CATEGORIES = ["shoes", "chalk", "merch", "rental"] as const;

/**
 * GET /api/admin/products
 * GET /api/admin/products?sku=xxx
 * GET /api/admin/products?barcode=xxx
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const sku = req.nextUrl.searchParams.get("sku")?.trim();
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();

  if (sku) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, category, price, cost, barcode, image")
      .eq("sku", sku)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  }
  if (barcode) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, category, price, cost, barcode, image")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, category, price, cost, barcode, image")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

/**
 * POST /api/admin/products - Create SKU
 * Body: { name, sku, category, price, cost?, barcode?, image? }
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const sku = typeof body.sku === "string" ? body.sku.trim() : "";
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    const price = typeof body.price === "number" ? Math.max(0, Math.round(body.price)) : typeof body.price === "string" ? Math.max(0, parseInt(body.price, 10) || 0) : 0;
    const cost = typeof body.cost === "number" ? Math.max(0, Math.round(body.cost)) : typeof body.cost === "string" ? Math.max(0, parseInt(body.cost, 10) || 0) : 0;
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() || null : null;
    const image = typeof body.image === "string" ? body.image.trim() || null : null;

    if (!name || !sku || !category) {
      return NextResponse.json({ error: "name, sku, and category required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({ name, sku, category, price, cost, barcode, image })
      .select("id, name, sku, category, price, cost, barcode, image")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
