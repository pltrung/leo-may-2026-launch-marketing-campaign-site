import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST /api/member/onboard
 * Called after signup with Bearer token. Creates member_profiles with tier Explorer.
 * Body: { full_name: string, email?: string, phone?: string, gender?: "male" | "female" }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() || null : null;
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    const gender = typeof body.gender === "string" && ["male", "female"].includes(body.gender.trim().toLowerCase())
      ? body.gender.trim().toLowerCase()
      : null;

    if (!fullName) {
      return NextResponse.json({ error: "full_name required" }, { status: 400 });
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, member_id: existing.id });
    }

    const { data: inserted, error } = await supabase
      .from("member_profiles")
      .insert({
        auth_id: user.id,
        email: email ?? user.email ?? null,
        phone,
        full_name: fullName,
        tier: "Explorer",
        membership_status: "inactive",
        gender,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Member onboard error:", error);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, member_id: inserted.id });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
