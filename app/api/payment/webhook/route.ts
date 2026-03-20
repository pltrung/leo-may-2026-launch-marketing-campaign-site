import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { computeNewExpiry } from "@/lib/membershipExtension";
import { bookNewbieClass } from "@/lib/newbieClassBooking";
import {
  amountsMatchVnd,
  effectivePriceForPlan,
  shouldClearCampaignMembershipDiscount,
} from "@/lib/newbieGraduateSale";
import { applyDayPassPurchaseBenefits } from "@/lib/membershipBenefits";

const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

/**
 * POST /api/payment/webhook
 * Called by payment gateway when payment succeeds.
 * Body: {
 *   status: "success",
 *   member_id?: uuid,      // or use member_code
 *   member_code?: string,  // memo from bank transfer
 *   plan_id: string,
 *   amount?: number,       // optional validation
 *   transaction_id?: string  // for idempotency
 * }
 */
export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers.get("x-webhook-secret") ?? "";
  if (secret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    status?: string;
    member_id?: string;
    member_code?: string;
    plan_id?: string;
    amount?: number;
    transaction_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "success") {
    return NextResponse.json({ received: true }); // acknowledge, no action
  }

  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const memberCode = typeof body.member_code === "string" ? body.member_code.trim() : "";
  const planId = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() || undefined : undefined;

  if (!planId) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  let memberRow: { id: string; member_code: string | null; membership_expires_at: string | null; visits_remaining?: number } | null = null;

  if (memberId) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at, visits_remaining")
      .eq("id", memberId)
      .maybeSingle();
    if (error) {
      console.error("webhook member fetch error", error);
      return NextResponse.json({ error: "Member lookup failed" }, { status: 500 });
    }
    memberRow = data;
  }

  if (!memberRow && memberCode) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at, visits_remaining")
      .eq("member_code", memberCode)
      .maybeSingle();
    if (error) {
      console.error("webhook member lookup by code error", error);
      return NextResponse.json({ error: "Member lookup failed" }, { status: 500 });
    }
    memberRow = data;
  }

  if (!memberRow) {
    return NextResponse.json({ error: "Member not found (member_id or member_code required)" }, { status: 404 });
  }

  const now = new Date();
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
  if (!validPlans.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  const { data: plan, error: planErr } = await supabase
    .from("membership_plans")
    .select("id, name, duration_days, duration_visits, price_vnd")
    .eq("id", planId)
    .maybeSingle();
  if (planErr || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const planName = plan.name as string;
  const listPriceVnd = plan.price_vnd as number;
  const { chargeVnd } = await effectivePriceForPlan(supabase, memberRow.id, planId, listPriceVnd);
  const amountVnd = chargeVnd;
  if (typeof body.amount === "number" && Number.isFinite(body.amount) && !amountsMatchVnd(body.amount, amountVnd)) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }
  const durationVisits = (plan.duration_visits as number | null) ?? 0;
  const isVisitPass = durationVisits > 0;
  const currentVisits = (memberRow.visits_remaining as number) ?? 0;
  const hasActiveVisitPass = currentVisits > 0;
  const expiresAt = memberRow.membership_expires_at ? new Date(memberRow.membership_expires_at as string) : null;
  const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
  if (hasActiveVisitPass && !isVisitPass) {
    return NextResponse.json({ error: "Active visit pass: cannot buy day pass" }, { status: 400 });
  }
  if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
    return NextResponse.json({ error: "Active day pass: visit pass only when inactive" }, { status: 400 });
  }
  const currentExpiry = memberRow.membership_expires_at
    ? new Date(memberRow.membership_expires_at as string)
    : null;
  const newExpiry = isVisitPass ? currentExpiry : computeNewExpiry(currentExpiry, (plan.duration_days as number) ?? 0, now);
  const newVisits = isVisitPass ? currentVisits + durationVisits : currentVisits;

  const memo = (memberRow.member_code as string | null) ?? memberRow.id;

  // Idempotency: if transaction_id provided and already exists, skip
  if (transactionId) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_transaction_id", transactionId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ received: true }); // already processed
    }
  }

  const insertPayload: Record<string, unknown> = {
    member_id: memberRow.id,
    plan_id: planId,
    amount: amountVnd,
    method: "gateway",
    status: "success",
    memo,
  };
  if (transactionId) insertPayload.gateway_transaction_id = transactionId;

  const { data: insertedPayment, error: payErr } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select("id")
    .single();
  if (payErr) {
    if (payErr.code === "23505") {
      return NextResponse.json({ received: true }); // unique violation, already processed
    }
    console.error("payment webhook insert error", payErr);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
  const paymentId = insertedPayment?.id ?? null;

  if (planId === "newbie_class" && paymentId) {
    await bookNewbieClass(supabase, memberRow.id, paymentId);
  }

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
    console.error("webhook member update error", updateErr);
    return NextResponse.json({ error: "Failed to extend membership" }, { status: 500 });
  }

  if (!isVisitPass && planId !== "newbie_class") {
    await applyDayPassPurchaseBenefits(
      supabase,
      memberRow.id,
      planId,
      newExpiry!,
      paymentId
    );
  }

  return NextResponse.json({ received: true });
}
