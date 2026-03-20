import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import {
  getUnifiedAdminOrStaffFromRequest,
  canAccessInventory,
} from "@/lib/unifiedAdminAuth";
import { insertAdminAuditLog, getStaffIdFromAuthId } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessInventory(unified.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("inventory_reorder_requests")
    .select("id, variant_id, quantity_requested, note, status, created_at, requested_by_staff_id")
    .in("status", ["pending", "approved", "ordered"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  const rows = (data ?? []) as {
    id: string;
    variant_id: string;
    quantity_requested: number;
    note: string | null;
    status: string;
    created_at: string;
    requested_by_staff_id: string | null;
  }[];

  const variantIds = Array.from(new Set(rows.map((r) => r.variant_id)));
  const requesterIds = Array.from(new Set(rows.map((r) => r.requested_by_staff_id).filter(Boolean))) as string[];

  const [variantRes, requesterRes] = await Promise.all([
    variantIds.length
      ? supabase
          .from("product_variants")
          .select("id, sku, size, products(name)")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as unknown[] }),
    requesterIds.length
      ? supabase.from("staff_profiles").select("id, display_name, email").in("id", requesterIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const variantLabel: Record<string, string> = {};
  for (const v of (variantRes.data ?? []) as { id: string; sku: string; size?: string | null; products?: { name?: string } | { name?: string }[] }[]) {
    const p = Array.isArray(v.products) ? v.products[0] : v.products;
    variantLabel[v.id] = [p?.name, v.sku, v.size ? `size ${v.size}` : null].filter(Boolean).join(" · ");
  }
  const requesterName: Record<string, string> = {};
  for (const s of (requesterRes.data ?? []) as { id: string; display_name?: string | null; email?: string | null }[]) {
    requesterName[s.id] = s.display_name || s.email || s.id;
  }

  const requestIds = rows.map((r) => r.id);
  const payState = new Map<string, { hasPending: boolean; hasPaid: boolean }>();
  for (const id of requestIds) payState.set(id, { hasPending: false, hasPaid: false });
  if (requestIds.length) {
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("reorder_request_id, status")
      .in("reorder_request_id", requestIds);
    for (const e of expenseRows ?? []) {
      const rid = e.reorder_request_id as string;
      const cur = payState.get(rid);
      if (!cur) continue;
      if (e.status === "paid") cur.hasPaid = true;
      else cur.hasPending = true;
      payState.set(rid, cur);
    }
  }

  return NextResponse.json({
    requests: rows.map((r) => {
      const ps = payState.get(r.id) ?? { hasPending: false, hasPaid: false };
      const expense_payment_status = ps.hasPaid ? "paid" : ps.hasPending ? "pending" : "none";
      return {
        ...r,
        variant_label: variantLabel[r.variant_id] ?? r.variant_id.slice(0, 8),
        requested_by_name: r.requested_by_staff_id ? requesterName[r.requested_by_staff_id] ?? "—" : "—",
        expense_payment_status,
        receive_stock_allowed: ps.hasPaid,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified?.staffId) {
    return NextResponse.json({ error: "Staff profile required" }, { status: 401 });
  }
  if (!canAccessInventory(unified.role)) {
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

export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessInventory(unified.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { request_id?: string; received_quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const requestId = String(body.request_id || "").trim();
  if (!requestId) return NextResponse.json({ error: "request_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: reqRow, error: reqErr } = await supabase
    .from("inventory_reorder_requests")
    .select("id, variant_id, quantity_requested, status")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr || !reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!["pending", "approved", "ordered"].includes(String(reqRow.status))) {
    return NextResponse.json({ error: "Request already resolved" }, { status: 400 });
  }

  const { data: paidExpense } = await supabase
    .from("expenses")
    .select("id")
    .eq("reorder_request_id", requestId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (!paidExpense) {
    return NextResponse.json(
      {
        error:
          "This restock cannot be received until Finance marks the linked expense as paid (Analytics → Finance → Expenses).",
      },
      { status: 403 }
    );
  }

  const receiveQty = Math.max(1, Math.floor(Number(body.received_quantity) || Number(reqRow.quantity_requested) || 1));
  const variantId = String(reqRow.variant_id);

  const { data: existingRows } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("variant_id", variantId)
    .is("location", null)
    .limit(1);
  const existing = existingRows?.[0] as { id: string; quantity: number } | undefined;
  if (existing) {
    await supabase
      .from("inventory")
      .update({ quantity: (existing.quantity ?? 0) + receiveQty, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("inventory")
      .insert({ variant_id: variantId, quantity: receiveQty, location: null });
  }

  const auditStaffId = unified.staffId ?? (await getStaffIdFromAuthId(supabase, unified.user.id));
  await insertAdminAuditLog(supabase, {
    adminAuthId: unified.user.id,
    staffId: auditStaffId,
    actionType: "inventory_stock_in",
    entityId: variantId,
    metadata: { source: "reorder_request_receive", reorder_request_id: requestId, quantity: receiveQty },
  });

  await supabase
    .from("inventory_reorder_requests")
    .update({
      status: "received",
      resolved_at: new Date().toISOString(),
      resolved_by_staff_id: unified.staffId ?? null,
    })
    .eq("id", requestId);

  return NextResponse.json({ ok: true, received_quantity: receiveQty });
}
