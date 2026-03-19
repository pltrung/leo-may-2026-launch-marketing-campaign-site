import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { verifyMomoIpnSignature, isMomoConfigured } from "@/lib/momo";
import { fulfillMembershipGatewayPayment } from "@/lib/fulfillGatewayMembership";

/**
 * POST /api/momo-ipn
 * MoMo server calls this when payment completes (configure same URL in MoMo merchant portal).
 */
export async function POST(req: NextRequest) {
  if (!isMomoConfigured()) {
    return NextResponse.json({ resultCode: 1006, message: "Config error" });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ resultCode: 1006, message: "Invalid body" });
  }

  if (!verifyMomoIpnSignature(body)) {
    return NextResponse.json({ resultCode: 1006, message: "Invalid signature" });
  }

  const resultCode = Number(body.resultCode);
  if (resultCode !== 0) {
    return NextResponse.json({ resultCode: 0, message: "Acknowledged" });
  }

  const orderInfo = String(body.orderInfo ?? "");
  const parts = orderInfo.split("|");
  const memberId = parts[0]?.trim() ?? "";
  const planId = parts[1]?.trim() ?? "";
  const transId = body.transId != null ? String(body.transId) : "";
  const paidVnd = Number(body.amount);

  if (!memberId || !planId || !transId || !Number.isFinite(paidVnd)) {
    return NextResponse.json({ resultCode: 1006, message: "Bad order" });
  }

  const supabase = createServerClient();
  const out = await fulfillMembershipGatewayPayment(supabase, {
    memberId,
    planId,
    paidAmountVnd: paidVnd,
    gatewayTransactionId: `momo-${transId}`,
    method: "momo",
  });

  if (out.ok) {
    return NextResponse.json({ resultCode: 0, message: "Success" });
  }
  if (out.kind === "duplicate") {
    return NextResponse.json({ resultCode: 0, message: "Duplicate OK" });
  }
  console.warn("momo-ipn fulfill failed", out.kind, { memberId, planId });
  return NextResponse.json({ resultCode: 1006, message: "Fulfill failed" });
}
