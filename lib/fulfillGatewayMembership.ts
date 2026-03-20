import type { SupabaseClient } from "@supabase/supabase-js";
import { computeNewExpiry } from "@/lib/membershipExtension";
import {
  amountsMatchVnd,
  effectivePriceForPlan,
  shouldClearCampaignMembershipDiscount,
} from "@/lib/newbieGraduateSale";
import { applyDayPassPurchaseBenefits } from "@/lib/membershipBenefits";

export const MEMBERSHIP_GATEWAY_PLANS = [
  "day_pass",
  "month_pass",
  "half_year_pass",
  "year_pass",
  "newbie_class",
  "visit_5",
  "visit_10",
  "visit_20",
] as const;

export type GatewayPaymentMethod = "vnpay" | "momo" | "zalopay" | "vietqr_auto";

export type FulfillGatewayResult =
  | { ok: true }
  | { ok: false; kind: "member_not_found" | "duplicate" | "invalid_plan" | "amount_mismatch" | "business_rule" | "db" };

/**
 * Shared fulfillment after VNPay / MoMo / ZaloPay confirms payment (amount + signature already verified by caller).
 */
export async function fulfillMembershipGatewayPayment(
  supabase: SupabaseClient,
  opts: {
    memberId: string;
    planId: string;
    paidAmountVnd: number;
    gatewayTransactionId: string | null;
    method: GatewayPaymentMethod;
    at?: Date;
  }
): Promise<FulfillGatewayResult> {
  const { memberId, planId, paidAmountVnd, gatewayTransactionId, method } = opts;
  const now = opts.at ?? new Date();

  if (!MEMBERSHIP_GATEWAY_PLANS.includes(planId as (typeof MEMBERSHIP_GATEWAY_PLANS)[number])) {
    return { ok: false, kind: "invalid_plan" };
  }

  const { data: memberRow, error: memberErr } = await supabase
    .from("member_profiles")
    .select("id, member_code, membership_expires_at, visits_remaining")
    .eq("id", memberId)
    .maybeSingle();

  if (memberErr || !memberRow) {
    return { ok: false, kind: "member_not_found" };
  }

  if (gatewayTransactionId) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_transaction_id", gatewayTransactionId)
      .maybeSingle();
    if (existing) {
      return { ok: false, kind: "duplicate" };
    }
  }

  const { data: plan, error: planErr } = await supabase
    .from("membership_plans")
    .select("id, duration_days, duration_visits, price_vnd")
    .eq("id", planId)
    .maybeSingle();
  if (planErr || !plan) {
    return { ok: false, kind: "invalid_plan" };
  }

  const listPriceVnd = plan.price_vnd as number;
  const { chargeVnd } = await effectivePriceForPlan(supabase, memberRow.id, planId, listPriceVnd, now);
  const amountVnd = chargeVnd;
  if (!amountsMatchVnd(paidAmountVnd, amountVnd)) {
    return { ok: false, kind: "amount_mismatch" };
  }

  const durationVisits = (plan.duration_visits as number | null) ?? 0;
  const durationDays = plan.duration_days ?? 0;
  const isVisitPass = durationVisits > 0;
  const currentVisits = (memberRow.visits_remaining as number) ?? 0;
  const hasActiveVisitPass = currentVisits > 0;
  const expiresAt = memberRow.membership_expires_at
    ? new Date(memberRow.membership_expires_at as string)
    : null;
  const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
  if (hasActiveVisitPass && !isVisitPass) {
    return { ok: false, kind: "business_rule" };
  }
  if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
    return { ok: false, kind: "business_rule" };
  }

  const currentExpiry = memberRow.membership_expires_at
    ? new Date(memberRow.membership_expires_at as string)
    : null;
  const newExpiry = isVisitPass ? currentExpiry : computeNewExpiry(currentExpiry, durationDays, now);
  const newVisits = isVisitPass ? currentVisits + durationVisits : currentVisits;
  const memo = (memberRow.member_code as string | null) ?? memberRow.id;

  const insertPayload: Record<string, unknown> = {
    member_id: memberRow.id,
    plan_id: planId,
    amount: amountVnd,
    method,
    status: "success",
    memo,
  };
  if (gatewayTransactionId) insertPayload.gateway_transaction_id = gatewayTransactionId;

  const { data: insertedPay, error: payErr } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select("id")
    .single();

  if (payErr) {
    if (payErr.code === "23505") {
      return { ok: false, kind: "duplicate" };
    }
    console.error(`${method} fulfillment insert error`, payErr);
    return { ok: false, kind: "db" };
  }
  const paymentId = insertedPay?.id ?? null;

  const updatePayload: Record<string, unknown> = { updated_at: now.toISOString() };
  if (isVisitPass) {
    updatePayload.visits_remaining = newVisits;
    updatePayload.membership_status = "active";
  } else {
    updatePayload.membership_expires_at = newExpiry!.toISOString();
    updatePayload.membership_status = "active";
  }
  if (shouldClearCampaignMembershipDiscount(planId, isVisitPass)) {
    updatePayload.campaign_membership_discount_percent = null;
    updatePayload.campaign_membership_discount_until = null;
  }
  const { error: updateErr } = await supabase
    .from("member_profiles")
    .update(updatePayload)
    .eq("id", memberRow.id);

  if (updateErr) {
    console.error(`${method} fulfillment member update error`, updateErr);
    return { ok: false, kind: "db" };
  }

  if (!isVisitPass && planId !== "newbie_class") {
    await applyDayPassPurchaseBenefits(supabase, memberRow.id, planId, newExpiry!, paymentId);
  }

  return { ok: true };
}
