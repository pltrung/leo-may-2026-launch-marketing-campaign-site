import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canCollectMembershipPayment } from "@/lib/unifiedAdminAuth";
import { getVietQRUrl } from "@/lib/vietqr";
import { computeNewExpiry } from "@/lib/membershipExtension";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";
import { isSepayWebhookConfigured } from "@/lib/sepayWebhook";
import { insertVietqrPendingOrder } from "@/lib/vietqrPendingOrder";

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
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canCollectMembershipPayment(unified.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  const planName = plan.name as string;
  const listPriceVnd = plan.price_vnd as number;
  const { chargeVnd, saleActive, saleEndsAt } = await effectivePriceForPlan(
    supabase,
    memberId,
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
    return NextResponse.json({ error: "Member has active visit pass. Can only add more visit passes." }, { status: 400 });
  }
  if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
    return NextResponse.json({ error: "Visit passes can only be purchased when member is inactive." }, { status: 400 });
  }
  const memberCode = (member.member_code as string | null) ?? `LM-${String(member.id).slice(0, 8).toUpperCase()}`;
  let memoHuman: string;
  let newExpiry: Date | null = null;
  if (isVisitPass) {
    memoHuman = `${memberCode} ${planName}`.replace(/\s+/g, " ").trim();
  } else {
    const now = new Date();
    const currentExpiry = member.membership_expires_at ? new Date(member.membership_expires_at as string) : null;
    newExpiry = computeNewExpiry(currentExpiry, (plan.duration_days as number) ?? 0, now);
    const dateStr = newExpiry.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    memoHuman = `${memberCode} ${planName} ${dateStr}`.replace(/\s+/g, " ").trim();
  }

  let memoQr = memoHuman;
  let bankTransferAuto = false;
  if (isSepayWebhookConfigured()) {
    const pending = await insertVietqrPendingOrder(supabase, {
      memberId,
      planId,
      amountVnd: priceVnd,
    });
    if (pending) {
      memoQr = pending.memoQr;
      bankTransferAuto = true;
    }
  }

  const qrUrl = getVietQRUrl(priceVnd, memoQr);
  return NextResponse.json({
    url: qrUrl,
    plan_name: planName,
    price_vnd: priceVnd,
    list_price_vnd: saleActive ? listPriceVnd : undefined,
    newbie_graduate_sale: saleActive
      ? { discount_percent: 50, ends_at: saleEndsAt }
      : undefined,
    memo: memoQr,
    memo_human: memoHuman,
    transfer_code: bankTransferAuto ? memoQr : null,
    bank_transfer_auto: bankTransferAuto,
    current_expiry: member.membership_expires_at ?? null,
    new_expiry: newExpiry?.toISOString() ?? null,
    visits_added: isVisitPass ? durationVisits : undefined,
  });
}
