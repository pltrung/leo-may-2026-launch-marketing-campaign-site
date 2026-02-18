import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/waitlist/me
 * Returns the waitlist row for the current auth user.
 * Header: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, name, email, phone, cloud_type, referral_code, referral_count, is_verified")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ user: null });

    const cloud = getCloudById((data.cloud_type as CloudType) || "may_nhe");
    if (!cloud) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: data.id,
        name: data.name || "Member",
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        team: data.cloud_type,
        referralCode: (data as { referral_code?: string }).referral_code ?? undefined,
        referralCount: typeof (data as { referral_count?: number }).referral_count === "number" ? (data as { referral_count: number }).referral_count : 0,
        isVerified: (data as { is_verified?: boolean }).is_verified === true,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
