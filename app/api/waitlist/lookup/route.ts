import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const phone = request.nextUrl.searchParams.get("phone")?.trim().replace(/\s/g, "");

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  }

  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      return NextResponse.json({ user: null });
    }

    const supabase = createServerClient();

    let data: { name: string; email: string | null; phone: string | null; cloud_type: string } | null = null;

    if (email) {
      const { data: byEmail, error: errE } = await supabase
        .from("waitlist")
        .select("name, email, phone, cloud_type")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!errE && byEmail) data = byEmail;
    }
    if (!data && phone) {
      const { data: byPhone, error: errP } = await supabase
        .from("waitlist")
        .select("name, email, phone, cloud_type")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!errP && byPhone) data = byPhone;
    }

    if (!data || !data.cloud_type) {
      return NextResponse.json({ user: null });
    }

    const cloud = getCloudById(data.cloud_type as CloudType);
    if (!cloud) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        name: data.name || "Member",
        email: data.email || undefined,
        phone: data.phone || undefined,
        team: data.cloud_type,
        timestamp: Date.now(),
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
