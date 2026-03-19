import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_MAX_OCCUPANCY = 30;
export const DEFAULT_BUSY_THRESHOLD_PCT = 70;

export interface GymOperationalSettingsRow {
  id: number;
  max_occupancy: number;
  busy_threshold_pct: number;
  google_business_url: string | null;
  google_maps_url: string | null;
  zalo_oa_url: string | null;
  business_tax_id: string | null;
  e_invoice_workflow_note: string | null;
  updated_at: string;
}

export function defaultOperationalSettings(): GymOperationalSettingsRow {
  return {
    id: 1,
    max_occupancy: DEFAULT_MAX_OCCUPANCY,
    busy_threshold_pct: DEFAULT_BUSY_THRESHOLD_PCT,
    google_business_url: null,
    google_maps_url: null,
    zalo_oa_url: null,
    business_tax_id: null,
    e_invoice_workflow_note: null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchGymOperationalSettings(
  supabase: SupabaseClient
): Promise<GymOperationalSettingsRow> {
  const { data, error } = await supabase
    .from("gym_operational_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return defaultOperationalSettings();
  }

  const row = data as Record<string, unknown>;
  return {
    id: 1,
    max_occupancy: typeof row.max_occupancy === "number" ? row.max_occupancy : DEFAULT_MAX_OCCUPANCY,
    busy_threshold_pct:
      typeof row.busy_threshold_pct === "number" ? row.busy_threshold_pct : DEFAULT_BUSY_THRESHOLD_PCT,
    google_business_url: (row.google_business_url as string) ?? null,
    google_maps_url: (row.google_maps_url as string) ?? null,
    zalo_oa_url: (row.zalo_oa_url as string) ?? null,
    business_tax_id: (row.business_tax_id as string) ?? null,
    e_invoice_workflow_note: (row.e_invoice_workflow_note as string) ?? null,
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export interface OccupancyPublicPayload {
  count: number;
  maxCapacity: number;
  busyThresholdPct: number;
  busyThresholdCount: number;
  isBusy: boolean;
  isAtCapacity: boolean;
}

export function buildOccupancyPayload(
  count: number,
  settings: GymOperationalSettingsRow
): OccupancyPublicPayload {
  const maxCapacity = Math.max(1, settings.max_occupancy);
  const pct = Math.min(100, Math.max(1, settings.busy_threshold_pct));
  const busyThresholdCount = Math.ceil((maxCapacity * pct) / 100);
  const isAtCapacity = count >= maxCapacity;
  const isBusy = count >= busyThresholdCount;
  return {
    count,
    maxCapacity,
    busyThresholdPct: pct,
    busyThresholdCount,
    isBusy,
    isAtCapacity,
  };
}
