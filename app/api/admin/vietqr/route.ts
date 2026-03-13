import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getVietQRUrl } from "@/lib/vietqr";

/**
 * GET ?plan_id=xxx&member_id=xxx
 * Returns { url, plan_name, price_vnd, memo } for VietQR payment
 */
export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("plan_id")?.trim();
  const memberId = req.nextUrl.searchParams.get("member_id")?.trim();
  if (!planId || !memberId) {
    return NextResponse.json({ error: "plan_id and member_id required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, member_code")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const memo = (member.member_code as string | null) ?? memberId;
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
  const qrUrl = getVietQRUrl(priceVnd, memo);
  return NextResponse.json({
    url: qrUrl,
    plan_name: planName,
    price_vnd: priceVnd,
    memo,
  });
}
