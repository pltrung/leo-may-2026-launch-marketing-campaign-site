import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getRouteSetterFromRequest } from "@/lib/routeSetterAuth";

/**
 * POST /api/route-setter/zones/[id]/reset
 * Marks the route zone as reset: sets last_reset_at = now, next_reset_at = last_reset_at + reset_frequency_days.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteSetterFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Zone id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: zone, error: fetchErr } = await supabase
    .from("route_zones")
    .select("id, reset_frequency_days")
    .eq("id", id)
    .single();

  if (fetchErr || !zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setDate(nextReset.getDate() + (zone.reset_frequency_days ?? 14));

  const { error: updateErr } = await supabase
    .from("route_zones")
    .update({
      last_reset_at: now.toISOString(),
      next_reset_at: nextReset.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    last_reset_at: now.toISOString(),
    next_reset_at: nextReset.toISOString(),
  });
}
