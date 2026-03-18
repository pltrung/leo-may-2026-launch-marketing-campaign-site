import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** GET — list this member's issued friend codes (unused + used summary). */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) return NextResponse.json({ codes: [] });

    const { data: rows, error } = await supabase
      .from("member_guest_invite_codes")
      .select("code, redeemed_at, expires_at, redeemed_by_member_id")
      .eq("issuer_member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("guest codes list", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    const now = Date.now();
    const codes = (rows ?? []).map((r) => ({
      code: r.code as string,
      used: !!(r.redeemed_by_member_id as string | null),
      expired: new Date(r.expires_at as string).getTime() < now,
      expires_at: r.expires_at as string,
    }));

    return NextResponse.json({ codes });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
