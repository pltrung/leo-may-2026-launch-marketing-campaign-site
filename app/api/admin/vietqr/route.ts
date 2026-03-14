import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getVietQRUrl } from "@/lib/vietqr";
import { computeNewExpiry } from "@/lib/membershipExtension";

/**
 * GET ?plan_id=xxx&member_id=xxx
 * Returns { url, plan_name, price_vnd, memo, current_expiry, new_expiry } for VietQR payment
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
    .select("id, member_code, membership_expires_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const memo = (member.member_code as string | null) ?? memberId;
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, name, price_vnd, duration_days")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const planName = plan.name as string;
  const priceVnd = plan.price_vnd as number;
  const now = new Date();
  const currentExpiry = member.membership_expires_at
    ? new Date(member.membership_expires_at as string)
    : null;
  const newExpiry = computeNewExpiry(currentExpiry, plan.duration_days ?? 0, now);
  const qrUrl = getVietQRUrl(priceVnd, memo);
  return NextResponse.json({
    url: qrUrl,
    plan_name: planName,
    price_vnd: priceVnd,
    memo,
    current_expiry: member.membership_expires_at ?? null,
    new_expiry: newExpiry.toISOString(),
  });
}
