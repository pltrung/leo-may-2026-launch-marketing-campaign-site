import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { fetchGymOperationalSettings } from "@/lib/gymOperationalSettings";

export const dynamic = "force-dynamic";

/**
 * Public links & display settings for /gym (no auth).
 */
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY)) {
      return NextResponse.json(
        { google_business_url: null, google_maps_url: null, zalo_oa_url: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const supabase = createServerClient();
    const s = await fetchGymOperationalSettings(supabase);
    return NextResponse.json(
      {
        google_business_url: s.google_business_url,
        google_maps_url: s.google_maps_url,
        zalo_oa_url: s.zalo_oa_url,
      },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (e) {
    console.error("public-settings", e);
    return NextResponse.json(
      { google_business_url: null, google_maps_url: null, zalo_oa_url: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
