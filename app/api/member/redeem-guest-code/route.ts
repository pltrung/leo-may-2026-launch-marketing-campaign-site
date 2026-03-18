import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST { code } — New member redeems a friend code → +1 visit. One redemption per member ever.
 * Eligible: account created within 30 days, zero visit check-ins, code unused & not expired.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!raw) return NextResponse.json({ error: "code required" }, { status: 400 });

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: redeemer } = await supabase
      .from("member_profiles")
      .select("id, created_at, visits_remaining")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!redeemer) {
      return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
    }
    const redeemerId = redeemer.id as string;

    const { data: prior } = await supabase
      .from("member_guest_invite_codes")
      .select("id")
      .eq("redeemed_by_member_id", redeemerId)
      .limit(1)
      .maybeSingle();
    if (prior) {
      return NextResponse.json(
        { error: "You have already redeemed a friend code." },
        { status: 400 }
      );
    }

    const created = new Date(redeemer.created_at as string).getTime();
    if (Date.now() - created > 30 * 86400000) {
      return NextResponse.json(
        { error: "Friend codes are for new members within 30 days of signup." },
        { status: 400 }
      );
    }

    const { count: visitCount } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", redeemerId)
      .eq("counts_as_visit", true);
    if ((visitCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Friend codes are for members who have not used a visit check-in yet." },
        { status: 400 }
      );
    }

    const { data: row } = await supabase
      .from("member_guest_invite_codes")
      .select("id, issuer_member_id, redeemed_by_member_id, expires_at")
      .eq("code", raw)
      .maybeSingle();
    if (!row || (row.redeemed_by_member_id as string | null)) {
      return NextResponse.json({ error: "Invalid or already used code." }, { status: 400 });
    }
    if ((row.issuer_member_id as string) === redeemerId) {
      return NextResponse.json({ error: "You cannot use your own code." }, { status: 400 });
    }
    if (new Date(row.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json({ error: "This code has expired." }, { status: 400 });
    }

    const visits = (redeemer.visits_remaining as number) ?? 0;
    const { error: updCode } = await supabase
      .from("member_guest_invite_codes")
      .update({
        redeemed_by_member_id: redeemerId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .is("redeemed_by_member_id", null);
    if (updCode) {
      return NextResponse.json({ error: "Could not redeem. Try again." }, { status: 500 });
    }

    const { error: updMember } = await supabase
      .from("member_profiles")
      .update({
        visits_remaining: visits + 1,
        membership_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", redeemerId);
    if (updMember) {
      await supabase
        .from("member_guest_invite_codes")
        .update({ redeemed_by_member_id: null, redeemed_at: null })
        .eq("id", row.id);
      return NextResponse.json({ error: "Failed to apply visit" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, visits_remaining: visits + 1 });
  } catch (e) {
    console.error("redeem guest code", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
