import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * PATCH /api/member/profile-extras
 * Guardian / minor flags, Zalo & SMS prefs — no photo/CCCD gate (member already onboarded).
 */
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.is_minor === "boolean") updates.is_minor = body.is_minor;
    if (typeof body.guardian_name === "string") updates.guardian_name = body.guardian_name.trim() || null;
    if (typeof body.guardian_phone === "string") updates.guardian_phone = body.guardian_phone.trim().replace(/\s+/g, "") || null;
    if (typeof body.zalo_user_id === "string") updates.zalo_user_id = body.zalo_user_id.trim() || null;
    if (typeof body.prefer_zalo_notifications === "boolean") updates.prefer_zalo_notifications = body.prefer_zalo_notifications;
    if (typeof body.prefer_sms_notifications === "boolean") updates.prefer_sms_notifications = body.prefer_sms_notifications;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const { error: updateErr } = await supabase.from("member_profiles").update(updates).eq("id", member.id);
    if (updateErr) {
      console.error("profile-extras", updateErr);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("profile-extras", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
