import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getVietQRUrl } from "@/lib/vietqr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET ?plan_id=xxx
 * Authorization: Bearer <token>
 * Returns VietQR URL for member's own renewal
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const planId = req.nextUrl.searchParams.get("plan_id")?.trim();
  const validPlans = ["day_pass", "explorer_month", "explorer_year", "until_end_of_year"];
  if (!planId || !validPlans.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }
  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_status, membership_expires_at")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const isActive =
      (member.membership_status as string) === "active" &&
      member.membership_expires_at &&
      new Date(member.membership_expires_at as string).getTime() > Date.now();
    if (planId === "day_pass" && isActive) {
      return NextResponse.json({ error: "Day Pass only for new members" }, { status: 400 });
    }
    if (planId === "until_end_of_year" && !isActive) {
      return NextResponse.json({ error: "Until end of year only for active members" }, { status: 400 });
    }
    let planName: string;
    let priceVnd: number;
    if (planId === "until_end_of_year") {
      const now = new Date();
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      const monthsRemaining = Math.max(1, Math.ceil((endOfYear.getTime() - now.getTime()) / (30 * 86400000)));
      priceVnd = monthsRemaining * 900000;
      planName = "Until end of year";
    } else {
      const { data: plan } = await supabase
        .from("membership_plans")
        .select("id, name, price_vnd")
        .eq("id", planId)
        .maybeSingle();
      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      planName = plan.name as string;
      priceVnd = plan.price_vnd as number;
    }
    const memo = (member.member_code as string | null) ?? member.id;
    const qrUrl = getVietQRUrl(priceVnd, memo);
    return NextResponse.json({
      url: qrUrl,
      plan_name: planName,
      price_vnd: priceVnd,
      memo,
    });
  } catch (e) {
    console.error("member vietqr error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
