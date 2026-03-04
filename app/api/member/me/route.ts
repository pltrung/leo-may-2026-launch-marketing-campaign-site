import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { EVOLUTION_LEVELS } from "@/lib/evolutionLevels";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function tierFromTierLevel(level: number): string {
  const idx = Math.max(0, Math.min(5, level - 1));
  return EVOLUTION_LEVELS[idx]?.nameEn ?? "Explorer";
}

/**
 * GET /api/member/me
 * Authorization: Bearer <access_token>
 * Returns member_profiles for current user. If none, migrates from waitlist (auth_id match) and returns new profile.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ member: null }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ member: null }, { status: 401 });
    }

    const supabase = createServerClient();

    let row = await supabase
      .from("member_profiles")
      .select("id, auth_id, email, phone, full_name, tier, waiver_signed, waiver_signed_at, created_at")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (row.error) {
      return NextResponse.json({ member: null }, { status: 500 });
    }

    if (!row.data) {
      const waitlistRow = await supabase
        .from("waitlist")
        .select("id, name, email, phone, tier_level, referral_count")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (waitlistRow.data) {
        const w = waitlistRow.data;
        const tier = tierFromTierLevel(typeof w.tier_level === "number" ? w.tier_level : 1);
        const { data: inserted, error: insertErr } = await supabase
          .from("member_profiles")
          .insert({
            auth_id: user.id,
            email: w.email ?? null,
            phone: w.phone ?? null,
            full_name: w.name ?? "Member",
            tier,
          })
          .select("id, auth_id, email, phone, full_name, tier, waiver_signed, waiver_signed_at, created_at")
          .single();

        if (!insertErr && inserted) row = { data: inserted, error: null };
      }
    }

    if (!row.data) {
      return NextResponse.json({ member: null }, { status: 404 });
    }

    const { count } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", row.data.id);

    const lastCheckin = await supabase
      .from("gym_checkins")
      .select("timestamp")
      .eq("member_id", row.data.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      member: {
        ...row.data,
        total_visits: count ?? 0,
        last_checkin: lastCheckin.data?.timestamp ?? null,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ member: null }, { status: 500 });
  }
}
