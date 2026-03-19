import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { EVOLUTION_LEVELS } from "@/lib/evolutionLevels";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import {
  getNewbieGraduateSaleWindow,
  NEWBIE_GRADUATE_DISCOUNT_PERCENT,
  NEWBIE_GRADUATE_SALE_PLAN_IDS,
} from "@/lib/newbieGraduateSale";
import {
  clearMerchDiscountIfLapsed,
  effectiveMerchDiscountPercent,
} from "@/lib/membershipBenefits";

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

    const { data: existing, error: rowError } = await supabase
      .from("member_profiles")
      .select("id, auth_id, email, phone, full_name, display_name, tier, waiver_signed, waiver_signed_at, created_at, member_code, membership_status, membership_expires_at, visits_remaining, guest_passes_remaining, profile_photo_url, id_number, date_of_birth, instagram_handle, gender, address, id_verified_from_cccd, current_streak, best_streak, merchandise_discount_percent, first_visit_welcomed_at, is_minor, guardian_name, guardian_phone, zalo_user_id, prefer_zalo_notifications, prefer_sms_notifications, credit_balance_vnd")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (rowError) {
      return NextResponse.json({ member: null }, { status: 500 });
    }

    let memberRow = existing;
    if (!memberRow) {
      const byAuthId = await supabase
        .from("waitlist")
        .select("id, name, email, phone, tier_level, referral_count, auth_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      let waitlistData = byAuthId.data;
      if (!waitlistData && user.email) {
        const byEmail = await supabase
          .from("waitlist")
          .select("id, name, email, phone, tier_level, referral_count, auth_id")
          .ilike("email", user.email.trim().toLowerCase())
          .maybeSingle();
        if (byEmail.data) {
          await supabase
            .from("waitlist")
            .update({ auth_id: user.id, updated_at: new Date().toISOString() })
            .eq("id", byEmail.data.id);
          waitlistData = byEmail.data;
        }
      }

      if (waitlistData) {
        const w = waitlistData;
        const tier = tierFromTierLevel(typeof w.tier_level === "number" ? w.tier_level : 1);
        const { data: inserted, error: insertErr } = await supabase
          .from("member_profiles")
          .insert({
            auth_id: user.id,
            email: w.email ?? user.email ?? null,
            phone: w.phone ?? null,
            full_name: w.name ?? user.user_metadata?.full_name ?? "Member",
            tier,
            membership_status: "inactive",
          })
          .select("id, auth_id, email, phone, full_name, display_name, tier, waiver_signed, waiver_signed_at, created_at, member_code, membership_status, membership_expires_at, visits_remaining, guest_passes_remaining, profile_photo_url, id_number, date_of_birth, instagram_handle, gender, address, id_verified_from_cccd, current_streak, best_streak, merchandise_discount_percent, first_visit_welcomed_at, is_minor, guardian_name, guardian_phone, zalo_user_id, prefer_zalo_notifications, prefer_sms_notifications, credit_balance_vnd")
          .single();

        if (!insertErr && inserted) memberRow = inserted;
      }
    }

    if (!memberRow) {
      return NextResponse.json({ member: null }, { status: 404 });
    }

    const { count } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberRow.id)
      .eq("counts_as_visit", true);

    const lastCheckin = await supabase
      .from("gym_checkins")
      .select("timestamp")
      .eq("member_id", memberRow.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startOfToday = getGymStartOfDay();
    const endOfToday = getGymEndOfDay();
    const { count: todayCount } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberRow.id)
      .gte("timestamp", startOfToday)
      .lte("timestamp", endOfToday);
    const checked_in_today = (todayCount ?? 0) >= 1;

    const saleWin = await getNewbieGraduateSaleWindow(supabase, memberRow.id as string);
    const newbie_graduate_sale = saleWin.active
      ? {
          ends_at: saleWin.endsAt,
          discount_percent: NEWBIE_GRADUATE_DISCOUNT_PERCENT,
          eligible_plan_ids: [...NEWBIE_GRADUATE_SALE_PLAN_IDS],
        }
      : null;

    let merchStored =
      (memberRow.merchandise_discount_percent as number) ?? 0;
    let merchandise_discount_effective = 0;
    try {
      await clearMerchDiscountIfLapsed(supabase, memberRow.id as string, {
        merchandise_discount_percent: memberRow.merchandise_discount_percent as number | null,
        membership_expires_at: memberRow.membership_expires_at as string | null,
        visits_remaining: memberRow.visits_remaining as number | null,
      });
      const { data: refreshed } = await supabase
        .from("member_profiles")
        .select("merchandise_discount_percent")
        .eq("id", memberRow.id)
        .maybeSingle();
      merchStored =
        (refreshed?.merchandise_discount_percent as number) ??
        (memberRow.merchandise_discount_percent as number) ??
        0;
      merchandise_discount_effective = effectiveMerchDiscountPercent({
        merchandise_discount_percent: merchStored,
        membership_expires_at: memberRow.membership_expires_at as string | null,
        visits_remaining: memberRow.visits_remaining as number | null,
      });
    } catch {
      merchandise_discount_effective = effectiveMerchDiscountPercent({
        merchandise_discount_percent: merchStored,
        membership_expires_at: memberRow.membership_expires_at as string | null,
        visits_remaining: memberRow.visits_remaining as number | null,
      });
    }

    return NextResponse.json({
      member: {
        ...memberRow,
        merchandise_discount_percent: merchStored,
        merchandise_discount_effective,
        total_visits: count ?? 0,
        last_checkin: lastCheckin.data?.timestamp ?? null,
        checked_in_today,
        newbie_graduate_sale,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ member: null }, { status: 500 });
  }
}
