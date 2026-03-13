import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

function formatRecent(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function GET(req: NextRequest) {
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
      "id, auth_id, email, phone, full_name, tier, member_code, created_at, membership_status, membership_expires_at, profile_photo_url, id_number, date_of_birth";

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

    // Total visits
    const { count: totalVisits } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId);

    // Check-ins this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: checkinsThisMonth } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("timestamp", startOfMonth.toISOString());

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

    const statusRaw = (memberRow.membership_status as string | null) || "inactive";
    const expiresAt = memberRow.membership_expires_at
      ? new Date(memberRow.membership_expires_at as string).getTime()
      : 0;
    const hasValidMembership = statusRaw === "active" && expiresAt > Date.now();

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
      recentCheckins,
      profile_photo_url: memberRow.profile_photo_url ?? null,
      id_number: memberRow.id_number ?? null,
      date_of_birth: memberRow.date_of_birth ?? null,
    };

    return NextResponse.json({ member: responseMember }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("admin members error", error);
    return NextResponse.json({ member: null, error: "Failed to load member" }, { status: 500 });
  }
}

