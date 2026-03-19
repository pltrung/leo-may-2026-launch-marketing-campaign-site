import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { verifyVnPaySecureHash } from "@/lib/vnpay";
import { fulfillMembershipGatewayPayment } from "@/lib/fulfillGatewayMembership";

const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET ?? "";

function mapFulfillToVnpay(
  out: Awaited<ReturnType<typeof fulfillMembershipGatewayPayment>>
): { RspCode: string; Message: string } {
  if (out.ok) return { RspCode: "00", Message: "Confirm Success" };
  switch (out.kind) {
    case "duplicate":
      return { RspCode: "02", Message: "Order already confirmed" };
    case "member_not_found":
      return { RspCode: "01", Message: "Order not found" };
    case "invalid_plan":
    case "amount_mismatch":
    case "business_rule":
      return { RspCode: "04", Message: "Invalid order" };
    default:
      return { RspCode: "99", Message: "Unknown error" };
  }
}

/**
 * GET /api/vnpay-ipn
 * VNPay IPN (Instant Payment Notification) - VNPay sends GET request when payment completes.
 */
export async function GET(req: NextRequest) {
  if (!VNPAY_HASH_SECRET) {
    return NextResponse.json({ RspCode: "99", Message: "Config error" });
  }

  const u = new URL(req.url);
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

  const vnpAmountRaw = parseInt(params.vnp_Amount ?? "0", 10);
  const paidVnd = vnpAmountRaw / 100;

  const supabase = createServerClient();
  const out = await fulfillMembershipGatewayPayment(supabase, {
    memberId,
    planId,
    paidAmountVnd: paidVnd,
    gatewayTransactionId: txnRef || null,
    method: "vnpay",
  });

  return NextResponse.json(mapFulfillToVnpay(out));
}
