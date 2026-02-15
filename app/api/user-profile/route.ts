import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const phone = request.nextUrl.searchParams.get("phone")?.trim().replace(/\s/g, "");

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      return NextResponse.json(null);
    }

    const supabase = createServerClient();

    let query = supabase
      .from("waitlist")
      .select("name, email, phone, cloud_type, referral_code, referral_count")
      .order("created_at", { ascending: false })
      .limit(1);

    if (email) {
      query = query.eq("email", email);
    } else {
      query = query.eq("phone", phone);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return NextResponse.json(null);

    const cloud = getCloudById((data.cloud_type as CloudType) || "may_nhe");
    const referralCount = typeof (data as { referral_count?: number }).referral_count === "number"
      ? (data as { referral_count: number }).referral_count
      : 0;
    const referralCode = (data as { referral_code?: string }).referral_code ?? null;

    return NextResponse.json({
      name: data.name || "Member",
      email: data.email || undefined,
      phone: data.phone || undefined,
      team: data.cloud_type,
      referralCode,
      referralCount,
      traitUnlocked: referralCount >= 10,
    }, { headers: { "Cache-Control": "no-store, max-age=10" } });
  } catch {
    return NextResponse.json(null);
  }
}
