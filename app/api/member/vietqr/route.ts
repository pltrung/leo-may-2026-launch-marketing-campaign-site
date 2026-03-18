import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getVietQRUrl } from "@/lib/vietqr";
import { computeNewExpiry } from "@/lib/membershipExtension";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";

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
  const validPlans = [
    "day_pass",
    "month_pass",
    "half_year_pass",
    "year_pass",
    "newbie_class",
    "visit_5",
    "visit_10",
    "visit_20",
  ];
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
      .select("id, member_code, membership_status, membership_expires_at, visits_remaining")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("id, name, price_vnd, duration_days, duration_visits")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const planName = plan.name as string;
    const listPriceVnd = plan.price_vnd as number;
    const { chargeVnd, saleActive, saleEndsAt } = await effectivePriceForPlan(
      supabase,
      member.id as string,
      planId,
      listPriceVnd
    );
    const priceVnd = chargeVnd;
    const durationVisits = (plan.duration_visits as number | null) ?? 0;
    const isVisitPass = durationVisits > 0;
    const currentVisits = (member.visits_remaining as number) ?? 0;
    const hasActiveVisitPass = currentVisits > 0;
    const expiresAt = member.membership_expires_at ? new Date(member.membership_expires_at as string) : null;
    const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
    if (hasActiveVisitPass && !isVisitPass) {
      return NextResponse.json({ error: "You have an active visit pass. You can only add more visit passes." }, { status: 400 });
    }
    if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
      return NextResponse.json({ error: "Visit passes can only be purchased when you have no active membership." }, { status: 400 });
    }
    const memberCode = (member.member_code as string | null) ?? `LM-${String(member.id).slice(0, 8).toUpperCase()}`;
    let memo: string;
    if (isVisitPass) {
      memo = `${memberCode} ${planName}`.replace(/\s+/g, " ").trim();
    } else {
      const now = new Date();
      const currentExpiry = member.membership_expires_at ? new Date(member.membership_expires_at as string) : null;
      const newExpiry = computeNewExpiry(currentExpiry, (plan.duration_days as number) ?? 0, now);
      const dateStr = newExpiry.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      memo = `${memberCode} ${planName} ${dateStr}`.replace(/\s+/g, " ").trim();
    }
    const qrUrl = getVietQRUrl(priceVnd, memo);
    const now = new Date();
    const currentExpiry = member.membership_expires_at ? new Date(member.membership_expires_at as string) : null;
    const newExpiry = isVisitPass ? null : computeNewExpiry(currentExpiry, (plan.duration_days as number) ?? 0, now);
    return NextResponse.json({
      url: qrUrl,
      plan_name: planName,
      price_vnd: priceVnd,
      list_price_vnd: saleActive ? listPriceVnd : undefined,
      newbie_graduate_sale: saleActive
        ? { discount_percent: 50, ends_at: saleEndsAt }
        : undefined,
      memo,
      current_expiry: member.membership_expires_at ?? null,
      new_expiry: newExpiry?.toISOString() ?? null,
      visits_added: isVisitPass ? durationVisits : undefined,
    });
  } catch (e) {
    console.error("member vietqr error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
