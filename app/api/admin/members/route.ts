import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymStartOfMonth, getGymStartOfDay, getGymEndOfDay, formatInGymTZ } from "@/lib/gymTimezone";

function formatRecent(timestamp: string): string {
  return formatInGymTZ(timestamp);
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim() || null;
  const code = url.searchParams.get("code")?.trim() || null;
  const name = url.searchParams.get("name")?.trim() || null;

  if (!id && !code && !name) {
    return NextResponse.json(
      { error: "id, code, or name is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  try {
    const baseSelect =
      "id, auth_id, email, phone, full_name, tier, member_code, created_at, membership_status, membership_expires_at, visits_remaining, profile_photo_url, id_number, date_of_birth, instagram_handle, gender, waiver_signed, waiver_signed_at";

    // Name search: return a list of basic matches to let the UI choose.
    if (!id && !code && name) {
      const { data, error } = await supabase
        .from("member_profiles")
        .select(baseSelect)
        .ilike("full_name", `%${name}%`)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      const members =
        data?.map((row) => ({
          id: row.id as string,
          displayId: (row.member_code as string | null) ?? null,
          name: (row.full_name as string) ?? "Member",
          membershipType: (row.tier as string) ?? "Member",
        })) ?? [];

      return NextResponse.json(
        { members },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    let memberRow: any = null;

    if (id) {
      const { data, error } = await supabase
        .from("member_profiles")
        .select(baseSelect)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      memberRow = data;
    } else if (code) {
      const { data, error } = await supabase
        .from("member_profiles")
        .select(baseSelect)
        .eq("member_code", code)
        .maybeSingle();
      if (error) throw error;
      memberRow = data;
    } else if (name) {
      const { data, error } = await supabase
        .from("member_profiles")
        .select(baseSelect)
        .ilike("full_name", `%${name}%`)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      memberRow = data;
    }

    if (!memberRow) {
      return NextResponse.json({ member: null }, { status: 404 });
    }

    const memberId = memberRow.id as string;

    // Latest waiver record (admin can view signed waiver)
    let waiverRecord: { waiver_text: string; signature: string | null; created_at: string; full_name: string } | null = null;
    const { data: waiverRow } = await supabase
      .from("member_waivers")
      .select("waiver_text, signature, created_at, full_name")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (waiverRow) {
      waiverRecord = {
        waiver_text: waiverRow.waiver_text as string,
        signature: (waiverRow.signature as string | null) ?? null,
        created_at: waiverRow.created_at as string,
        full_name: (waiverRow.full_name as string) ?? memberRow.full_name,
      };
    }

    // Total visits
    const { count: totalVisits } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId);

    // Check-ins this month (gym TZ = America/Los_Angeles)
    const startOfMonth = getGymStartOfMonth();
    const startOfToday = getGymStartOfDay();
    const endOfToday = getGymEndOfDay();

    const { count: checkinsThisMonth } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("timestamp", startOfMonth);

    // Recent check-ins (latest 5)
    const { data: recent, error: recentErr } = await supabase
      .from("gym_checkins")
      .select("timestamp")
      .eq("member_id", memberId)
      .order("timestamp", { ascending: false })
      .limit(5);

    if (recentErr) throw recentErr;

    const recentCheckins = (recent ?? []).map((r) => ({
      label: formatRecent(r.timestamp as string),
    }));

    const { count: todayCount } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("timestamp", startOfToday)
      .lte("timestamp", endOfToday);
    const checked_in_today = (todayCount ?? 0) >= 1;

    const statusRaw = (memberRow.membership_status as string | null) || "inactive";
    const expiresAt = memberRow.membership_expires_at
      ? new Date(memberRow.membership_expires_at as string).getTime()
      : 0;
    const visitsRemaining = (memberRow.visits_remaining as number) ?? 0;
    const hasValidDayPass = statusRaw === "active" && expiresAt > Date.now();
    const hasValidVisitPass = visitsRemaining > 0;
    const hasValidMembership = hasValidDayPass || hasValidVisitPass;

    const status =
      statusRaw === "frozen"
        ? ("Frozen" as const)
        : statusRaw === "cancelled"
        ? ("Cancelled" as const)
        : hasValidMembership
        ? ("Active" as const)
        : ("Inactive" as const);

    let validUntil = "—";
    if (memberRow.membership_expires_at) {
      const d = new Date(memberRow.membership_expires_at as string);
      validUntil = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    }

    const responseMember = {
      id: memberRow.id,
      displayId: memberRow.member_code ?? null,
      name: memberRow.full_name,
      email: memberRow.email,
      phone: memberRow.phone,
      membershipType: memberRow.tier,
      status,
      validUntil,
      checkinsThisMonth: checkinsThisMonth ?? 0,
      totalVisits: totalVisits ?? 0,
      checked_in_today,
      recentCheckins,
      profile_photo_url: memberRow.profile_photo_url ?? null,
      id_number: memberRow.id_number ?? null,
      date_of_birth: memberRow.date_of_birth ?? null,
      instagram_handle: memberRow.instagram_handle ?? null,
      gender: memberRow.gender ?? null,
      visits_remaining: visitsRemaining,
      has_active_day_pass: hasValidDayPass,
      has_active_visit_pass: hasValidVisitPass,
      waiver_signed: !!memberRow.waiver_signed,
      waiver_signed_at: memberRow.waiver_signed_at ?? null,
      waiver: waiverRecord,
    };

    return NextResponse.json({ member: responseMember }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("admin members error", error);
    return NextResponse.json({ member: null, error: "Failed to load member" }, { status: 500 });
  }
}

