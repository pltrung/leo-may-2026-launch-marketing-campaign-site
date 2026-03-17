import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessInventory } from "@/lib/unifiedAdminAuth";

const SKU_PATTERN = /^[A-Za-z0-9\-\[\]]+(-[A-Za-z0-9\-\[\]]+)?$/;

/**
 * PATCH /api/admin/variants/[id]
 * Body: { sku?, size?, barcode?, price?, cost? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessInventory(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Variant id required" }, { status: 400 });

  const supabase = createServerClient();
  try {
    const body = await req.json();
    const updates: { sku?: string; size?: string | null; barcode?: string | null; price?: number; cost?: number } = {};

    if (typeof body.sku === "string") {
      const sku = body.sku.trim();
      if (sku && SKU_PATTERN.test(sku)) updates.sku = sku;
    }
    if (body.size !== undefined) {
      updates.size = typeof body.size === "string" ? body.size.trim() || null : null;
    }
    if (body.barcode !== undefined) {
      updates.barcode = typeof body.barcode === "string" ? body.barcode.trim() || null : null;
    }
    if (typeof body.price === "number" && body.price >= 0) updates.price = body.price;
    else if (body.price !== undefined) {
      const p = parseInt(String(body.price), 10);
      if (!Number.isNaN(p) && p >= 0) updates.price = p;
    }
    if (typeof body.cost === "number" && body.cost >= 0) updates.cost = body.cost;
    else if (body.cost !== undefined) {
      const c = parseInt(String(body.cost), 10);
      if (!Number.isNaN(c) && c >= 0) updates.cost = c;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (updates.barcode != null) {
      const { data: existing } = await supabase
        .from("product_variants")
        .select("id")
        .eq("barcode", updates.barcode)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Barcode already in use by another variant" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("product_variants")
      .update(updates)
      .eq("id", id)
      .select("id, product_id, sku, size, barcode, price, cost")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ variant: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
