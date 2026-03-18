import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import {
  getUnifiedAdminOrStaffFromRequest,
  canAccessInventory,
  canDoCheckIn,
} from "@/lib/unifiedAdminAuth";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!unified.staffId) return NextResponse.json({ requests: [] });
  if (!canAccessInventory(unified.role) && !canDoCheckIn(unified.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("inventory_reorder_requests")
    .select("id, variant_id, quantity_requested, note, status, created_at")
    .eq("requested_by_staff_id", unified.staffId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified?.staffId) {
    return NextResponse.json({ error: "Staff profile required" }, { status: 401 });
  }
  if (!canAccessInventory(unified.role) && !canDoCheckIn(unified.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { variant_id?: string; quantity_requested?: number; note?: string; estimated_unit_cost?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const variant_id = String(body.variant_id || "").trim();
  const qty = Math.max(1, Math.floor(Number(body.quantity_requested) || 0));
  if (!variant_id || !qty) {
    return NextResponse.json({ error: "variant_id and quantity_requested required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: v } = await supabase.from("product_variants").select("id").eq("id", variant_id).maybeSingle();
  if (!v) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const { data: row, error } = await supabase
    .from("inventory_reorder_requests")
    .insert({
      variant_id,
      quantity_requested: qty,
      note: body.note ? String(body.note).slice(0, 500) : null,
      requested_by_staff_id: unified.staffId,
      estimated_unit_cost:
        body.estimated_unit_cost != null && Number.isFinite(Number(body.estimated_unit_cost))
          ? Number(body.estimated_unit_cost)
          : null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  return NextResponse.json({ ok: true, id: row?.id });
}
