import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
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

  const validPlans = ["day_pass", "explorer_month", "explorer_year", "until_end_of_year"];
  if (!validPlans.includes(planId)) {
    return NextResponse.json({ RspCode: "04", Message: "Invalid plan" });
  }

  const supabase = createServerClient();

  const { data: memberRow, error: memberErr } = await supabase
    .from("member_profiles")
    .select("id, member_code, membership_expires_at")
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
  let amountVnd: number;
  let newExpiry: Date;

  if (planId === "until_end_of_year") {
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const monthsRemaining = Math.max(1, Math.ceil((endOfYear.getTime() - now.getTime()) / (30 * 86400000)));
    amountVnd = monthsRemaining * 900000;
    newExpiry = endOfYear;
  } else {
    const { data: plan, error: planErr } = await supabase
      .from("membership_plans")
      .select("id, duration_days, price_vnd")
      .eq("id", planId)
      .maybeSingle();
    if (planErr || !plan) {
      return NextResponse.json({ RspCode: "04", Message: "Plan not found" });
    }
    amountVnd = plan.price_vnd as number;
    const currentExpiry = memberRow.membership_expires_at
      ? new Date(memberRow.membership_expires_at as string)
      : null;
    const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
    newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + (plan.duration_days ?? 0));
  }

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

  const { error: updateErr } = await supabase
    .from("member_profiles")
    .update({
      membership_expires_at: newExpiry.toISOString(),
      membership_status: "active",
      updated_at: now.toISOString(),
    })
    .eq("id", memberRow.id);

  if (updateErr) {
    console.error("vnpay ipn member update error", updateErr);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }

  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
