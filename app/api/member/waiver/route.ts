import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST /api/member/waiver
 * Body: { full_name: string, agreed: boolean, signature_data?: string }
 * Sets waiver_signed = true and waiver_signed_at for current member.
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
    const agreed = body.agreed === true;

    if (!fullName || !agreed) {
      return NextResponse.json(
        { error: "Full name and agreement required" },
        { status: 400 }
      );
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("member_profiles")
      .update({
        waiver_signed: true,
        waiver_signed_at: new Date().toISOString(),
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_id", user.id);

    if (error) {
      console.error("Waiver update error:", error);
      return NextResponse.json({ error: "Failed to save waiver" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
