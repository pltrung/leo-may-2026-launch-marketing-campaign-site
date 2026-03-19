import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/gymOperationsAdminAuth";
import { defaultOperationalSettings, fetchGymOperationalSettings } from "@/lib/gymOperationalSettings";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const settings = await fetchGymOperationalSettings(supabase);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const supabase = createServerClient();
  const current = await fetchGymOperationalSettings(supabase);

  const maxOccupancy =
    typeof body.max_occupancy === "number" && body.max_occupancy >= 1 && body.max_occupancy <= 500
      ? Math.floor(body.max_occupancy)
      : current.max_occupancy;
  const busyThresholdPct =
    typeof body.busy_threshold_pct === "number" && body.busy_threshold_pct >= 1 && body.busy_threshold_pct <= 100
      ? Math.floor(body.busy_threshold_pct)
      : current.busy_threshold_pct;

  const patch = {
    id: 1,
    max_occupancy: maxOccupancy,
    busy_threshold_pct: busyThresholdPct,
    google_business_url:
      typeof body.google_business_url === "string" ? body.google_business_url.trim() || null : current.google_business_url,
    google_maps_url:
      typeof body.google_maps_url === "string" ? body.google_maps_url.trim() || null : current.google_maps_url,
    zalo_oa_url: typeof body.zalo_oa_url === "string" ? body.zalo_oa_url.trim() || null : current.zalo_oa_url,
    business_tax_id:
      typeof body.business_tax_id === "string" ? body.business_tax_id.trim() || null : current.business_tax_id,
    e_invoice_workflow_note:
      typeof body.e_invoice_workflow_note === "string"
        ? body.e_invoice_workflow_note.trim() || null
        : current.e_invoice_workflow_note,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("gym_operational_settings").upsert(patch, { onConflict: "id" });
  if (error) {
    console.error("gym_operational_settings upsert", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
  const settings = await fetchGymOperationalSettings(supabase);
  return NextResponse.json({ settings });
}
