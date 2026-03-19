import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";

export async function PATCH(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    staff_id?: string;
    monthly_salary?: number;
    commission_rate?: number;
    compensation_type?: "hourly" | "monthly";
    hourly_rate_vnd?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const staff_id = String(body.staff_id || "").trim();
  if (!staff_id) return NextResponse.json({ error: "staff_id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.monthly_salary != null) patch.monthly_salary = Math.max(0, Number(body.monthly_salary));
  if (body.commission_rate != null) {
    const r = Number(body.commission_rate);
    patch.commission_rate = Math.min(1, Math.max(0, r));
  }
  if (body.compensation_type === "hourly" || body.compensation_type === "monthly") {
    patch.compensation_type = body.compensation_type;
  }
  if (body.hourly_rate_vnd != null) patch.hourly_rate_vnd = Math.max(0, Number(body.hourly_rate_vnd));
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({
      error: "monthly_salary, commission_rate, compensation_type, or hourly_rate_vnd required",
    }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("staff_profiles").update(patch).eq("id", staff_id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
