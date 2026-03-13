import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Action = "freeze" | "unfreeze";

/**
 * POST - Member self-service: freeze or unfreeze membership
 * Body: { action: "freeze" | "unfreeze" }
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
    if (action !== "freeze" && action !== "unfreeze") {
      return NextResponse.json({ error: "action must be 'freeze' or 'unfreeze'" }, { status: 400 });
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
    const nextStatus = action === "freeze" ? "frozen" : "active";
    if (action === "unfreeze" && (member.membership_status as string) !== "frozen") {
      return NextResponse.json({ error: "Membership is not frozen" }, { status: 400 });
    }
    const { error } = await supabase
      .from("member_profiles")
      .update({
        membership_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id);
    if (error) {
      console.error("member membership error", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("member membership error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
