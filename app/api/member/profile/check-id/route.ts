import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/profile/check-id?id_number=xxx
 * Returns { available: boolean } — true if the id_number can be used by this member (unique or already theirs).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idNumber = req.nextUrl.searchParams.get("id_number")?.trim() ?? "";
  if (!idNumber) {
    return NextResponse.json({ available: true });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: currentMember } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!currentMember) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { data: other } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("id_number", idNumber)
      .neq("id", currentMember.id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ available: !other });
  } catch (e) {
    console.error("check-id error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
