/**
 * POST /api/member/redeem-milestone-guest
 * Bearer token. Body: { code }. Friend redeems owner's milestone guest code → +1 visit for redeemer. One use per code; owner cannot redeem own codes.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!raw) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: member, error: mErr } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (mErr || !member?.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { data: row, error: findErr } = await supabase
    .from("milestone_guest_pass_codes")
    .select("id, owner_member_id, redeemed_by_member_id")
    .eq("code", raw)
    .maybeSingle();

  if (findErr || !row) {
    return NextResponse.json({ error: "Invalid or unknown code" }, { status: 404 });
  }
  if (row.redeemed_by_member_id) {
    return NextResponse.json({ error: "This code has already been used" }, { status: 400 });
  }
  if (row.owner_member_id === member.id) {
    return NextResponse.json(
      { error: "You can't use your own guest pass code. Share it with a friend." },
      { status: 403 }
    );
  }

  const { error: updErr } = await supabase
    .from("milestone_guest_pass_codes")
    .update({
      redeemed_by_member_id: member.id,
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .is("redeemed_by_member_id", null);

  if (updErr) {
    return NextResponse.json({ error: "Could not apply code" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("visits_remaining")
    .eq("id", member.id)
    .single();
  const v = (profile?.visits_remaining as number) ?? 0;
  await supabase
    .from("member_profiles")
    .update({ visits_remaining: v + 1, updated_at: new Date().toISOString() })
    .eq("id", member.id);

  return NextResponse.json({
    success: true,
    message: "1 free visit added to your account.",
    messageVi: "Đã thêm 1 lượt miễn phí vào tài khoản của bạn.",
  });
}
