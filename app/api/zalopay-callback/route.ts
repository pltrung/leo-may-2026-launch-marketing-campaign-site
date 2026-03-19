import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { zalopayVerifyCallbackMac, isZaloPayConfigured } from "@/lib/zalopay";
import { fulfillMembershipGatewayPayment } from "@/lib/fulfillGatewayMembership";

type ZpData = {
  app_id?: number;
  app_trans_id?: string;
  amount?: number;
  embed_data?: string;
  zp_trans_id?: number;
};

function parseEmbed(embedRaw: string | undefined): { m?: string; p?: string } {
  if (!embedRaw) return {};
  try {
    const o = JSON.parse(embedRaw) as Record<string, unknown>;
    const m = typeof o.lm_m === "string" ? o.lm_m : undefined;
    const p = typeof o.lm_p === "string" ? o.lm_p : undefined;
    return { m, p };
  } catch {
    return {};
  }
}

/**
 * POST /api/zalopay-callback
 * ZaloPay server-to-server notification (set as callback_url on create order).
 */
export async function POST(req: NextRequest) {
  if (!isZaloPayConfigured()) {
    return NextResponse.json({ return_code: 2, return_message: "Config" });
  }

  let payload: { data?: string; mac?: string; type?: number };
  try {
    payload = (await req.json()) as { data?: string; mac?: string; type?: number };
  } catch {
    return NextResponse.json({ return_code: 2, return_message: "Invalid" });
  }

  const dataRaw = payload.data;
  const mac = payload.mac;
  if (!dataRaw || !mac || !zalopayVerifyCallbackMac(dataRaw, mac)) {
    return NextResponse.json({ return_code: 2, return_message: "Invalid mac" });
  }

  let data: ZpData;
  try {
    data = JSON.parse(dataRaw) as ZpData;
  } catch {
    return NextResponse.json({ return_code: 2, return_message: "Bad data" });
  }

  const paidVnd = Number(data.amount);
  const zp_trans_id = data.zp_trans_id != null ? String(data.zp_trans_id) : "";
  const { m: memberId, p: planId } = parseEmbed(data.embed_data);

  if (!memberId || !planId || !zp_trans_id || !Number.isFinite(paidVnd)) {
    return NextResponse.json({ return_code: 2, return_message: "Missing fields" });
  }

  const supabase = createServerClient();
  const out = await fulfillMembershipGatewayPayment(supabase, {
    memberId,
    planId,
    paidAmountVnd: paidVnd,
    gatewayTransactionId: `zlp-${zp_trans_id}`,
    method: "zalopay",
  });

  if (out.ok || out.kind === "duplicate") {
    return NextResponse.json({ return_code: 1, return_message: "Success" });
  }
  console.warn("zalopay-callback fulfill failed", out.kind, { memberId, planId });
  return NextResponse.json({ return_code: 2, return_message: "Fulfill failed" });
}
