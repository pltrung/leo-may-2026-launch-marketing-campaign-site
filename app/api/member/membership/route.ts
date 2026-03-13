import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Action = "freeze";

/**
 * POST - Member self-service: freeze membership
 * Body: { action: "freeze" }
 */
export async function POST(req: NextRequest) {
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
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const action = body?.action as Action | undefined;
    if (action !== "freeze") {
      return NextResponse.json({ error: "action must be 'freeze'" }, { status: 400 });
    }
    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id, membership_status")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const { error } = await supabase
      .from("member_profiles")
      .update({
        membership_status: "frozen",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id);
    if (error) {
      console.error("member freeze error", error);
      return NextResponse.json({ error: "Failed to freeze" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("member membership error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
