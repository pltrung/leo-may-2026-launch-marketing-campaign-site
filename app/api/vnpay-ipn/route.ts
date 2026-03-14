import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { computeNewExpiry } from "@/lib/membershipExtension";
import { verifyVnPaySecureHash } from "@/lib/vnpay";

const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET ?? "";

/**
 * GET /api/vnpay-ipn
 * VNPay IPN (Instant Payment Notification) - VNPay sends GET request when payment completes.
 * Must validate vnp_SecureHash and return JSON response per VNPay spec.
 */
export async function GET(req: NextRequest) {
  if (!VNPAY_HASH_SECRET) {
    return NextResponse.json({ RspCode: "99", Message: "Config error" });
  }

  const url = req.url;
  const u = new URL(url);
  const params: Record<string, string> = {};
  u.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (!verifyVnPaySecureHash(params, VNPAY_HASH_SECRET)) {
    return NextResponse.json({ RspCode: "97", Message: "Invalid Checksum" });
  }

  const responseCode = params.vnp_ResponseCode ?? "";
  if (responseCode !== "00") {
    return NextResponse.json({ RspCode: "07", Message: "Transaction failed" });
  }

  const orderInfo = params.vnp_OrderInfo ?? "";
  const txnRef = params.vnp_TxnRef ?? params.vnp_TransactionNo ?? "";
  const parts = orderInfo.split("|");
  const memberId = parts[0]?.trim() ?? "";
  const planId = parts[1]?.trim() ?? "";

  if (!memberId || !planId) {
    return NextResponse.json({ RspCode: "04", Message: "Invalid order info" });
  }

  const validPlans = ["day_pass", "month_pass", "year_pass", "newbie_class", "visit_5", "visit_10", "visit_20"];
  if (!validPlans.includes(planId)) {
    return NextResponse.json({ RspCode: "04", Message: "Invalid plan" });
  }

  const supabase = createServerClient();

  const { data: memberRow, error: memberErr } = await supabase
    .from("member_profiles")
    .select("id, member_code, membership_expires_at, visits_remaining")
    .eq("id", memberId)
    .maybeSingle();

  if (memberErr || !memberRow) {
    return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  }

  if (txnRef) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_transaction_id", txnRef)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }
  }

  const now = new Date();
  const { data: plan, error: planErr } = await supabase
    .from("membership_plans")
    .select("id, duration_days, duration_visits, price_vnd")
    .eq("id", planId)
    .maybeSingle();
  if (planErr || !plan) {
    return NextResponse.json({ RspCode: "04", Message: "Plan not found" });
  }
  const amountVnd = plan.price_vnd as number;
  const durationVisits = (plan.duration_visits as number | null) ?? 0;
  const durationDays = (plan.duration_days ?? 0);
  const isVisitPass = durationVisits > 0;
  const currentVisits = (memberRow.visits_remaining as number) ?? 0;
  const hasActiveVisitPass = currentVisits > 0;
  const expiresAt = memberRow.membership_expires_at ? new Date(memberRow.membership_expires_at as string) : null;
  const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
  if (hasActiveVisitPass && !isVisitPass) {
    return NextResponse.json({ RspCode: "04", Message: "Active visit pass: cannot buy day pass" });
  }
  if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
    return NextResponse.json({ RspCode: "04", Message: "Active day pass: visit pass only when inactive" });
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
    method: "vnpay",
    status: "success",
    memo,
  };
  if (txnRef) insertPayload.gateway_transaction_id = txnRef;

  const { error: payErr } = await supabase.from("payments").insert(insertPayload);
  if (payErr) {
    if (payErr.code === "23505") {
      return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
    }
    console.error("vnpay ipn insert error", payErr);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }

  const updatePayload: Record<string, unknown> = { updated_at: now.toISOString() };
  if (isVisitPass) {
    updatePayload.visits_remaining = newVisits;
    updatePayload.membership_status = "active";
  } else {
    updatePayload.membership_expires_at = newExpiry!.toISOString();
    updatePayload.membership_status = "active";
  }
  const { error: updateErr } = await supabase
    .from("member_profiles")
    .update(updatePayload)
    .eq("id", memberRow.id);

  if (updateErr) {
    console.error("vnpay ipn member update error", updateErr);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }

  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
