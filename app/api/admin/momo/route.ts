import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canCollectMembershipPayment } from "@/lib/unifiedAdminAuth";
import { momoCreatePayment, isMomoConfigured } from "@/lib/momo";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";
import { MEMBERSHIP_GATEWAY_PLANS } from "@/lib/fulfillGatewayMembership";
import { randomUUID } from "crypto";

function publicBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

/**
 * GET ?plan_id=xxx&member_id=xxx&return_url=optional
 * Staff/admin: create MoMo payment for a member.
 */
export async function GET(req: NextRequest) {
  if (!isMomoConfigured()) {
    return NextResponse.json({ error: "MoMo not configured" }, { status: 503 });
  }

  const planId = req.nextUrl.searchParams.get("plan_id")?.trim();
  const memberId = req.nextUrl.searchParams.get("member_id")?.trim();
  const returnUrl = req.nextUrl.searchParams.get("return_url")?.trim();

  if (!planId || !memberId) {
    return NextResponse.json({ error: "plan_id and member_id required" }, { status: 400 });
  }
  if (!MEMBERSHIP_GATEWAY_PLANS.includes(planId as (typeof MEMBERSHIP_GATEWAY_PLANS)[number])) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canCollectMembershipPayment(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = publicBaseUrl(req);
  const finalReturn = returnUrl || `${base}/admin`;

  const supabase = createServerClient();
  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, member_code, membership_expires_at, visits_remaining")
    .eq("id", memberId)
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

  const durationVisits = (plan.duration_visits as number | null) ?? 0;
  const isVisitPass = durationVisits > 0;
  const currentVisits = (member.visits_remaining as number) ?? 0;
  const hasActiveVisitPass = currentVisits > 0;
  const expiresAt = member.membership_expires_at
    ? new Date(member.membership_expires_at as string)
    : null;
  const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
  if (hasActiveVisitPass && !isVisitPass) {
    return NextResponse.json(
      { error: "Member has active visit pass. Can only add visit passes." },
      { status: 400 }
    );
  }
  if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
    return NextResponse.json(
      { error: "Visit passes only when member is inactive." },
      { status: 400 }
    );
  }

  const listPriceVnd = plan.price_vnd as number;
  const pricing = await effectivePriceForPlan(supabase, memberId, planId, listPriceVnd);
  const chargeVnd = pricing.chargeVnd;

  const orderId = `LM${memberId.replace(/-/g, "").slice(0, 10)}${Date.now()}`;
  const requestId = randomUUID();
  const orderInfo = `${memberId}|${planId}`;

  const created = await momoCreatePayment({
    orderId,
    requestId,
    amountVnd: chargeVnd,
    orderInfo,
    redirectUrl: finalReturn,
    ipnUrl: `${base}/api/momo-ipn`,
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.message }, { status: 502 });
  }

  return NextResponse.json({
    pay_url: created.payUrl,
    deeplink: created.deeplink,
    qr_code_url: created.qrCodeUrl,
    plan_name: plan.name,
    price_vnd: chargeVnd,
    list_price_vnd: pricing.saleActive ? listPriceVnd : undefined,
    campaign_membership_sale: pricing.campaign_membership_sale ?? undefined,
    newbie_graduate_sale: pricing.newbie_graduate_sale ?? undefined,
    order_id: orderId,
  });
}
