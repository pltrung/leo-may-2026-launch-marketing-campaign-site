import { createServerClient } from "@/lib/supabaseServer";
import { amountsMatchVnd } from "@/lib/newbieGraduateSale";
import { fulfillMembershipGatewayPayment } from "@/lib/fulfillGatewayMembership";

const SEPAY_API_KEY = process.env.SEPAY_WEBHOOK_API_KEY ?? "";

export function isSepayWebhookConfigured(): boolean {
  return !!SEPAY_API_KEY;
}

export function verifySepayAuthorization(header: string | null): boolean {
  if (!SEPAY_API_KEY) return false;
  const expected = `Apikey ${SEPAY_API_KEY}`;
  return header === expected;
}

export type SepayPayload = {
  id?: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: string;
  transferAmount?: number;
  accumulated?: number;
  subAccount?: string | null;
  referenceCode?: string;
  description?: string;
};

/**
 * SePay "money in" → match open VietQR pending row by transfer content + amount → auto-extend membership.
 * Idempotent via payments.gateway_transaction_id = sepay-{id}.
 */
export async function processSepayInboundTransfer(payload: SepayPayload): Promise<{ ok: boolean; reason?: string }> {
  if (payload.transferType !== "in") {
    return { ok: true, reason: "ignored_out" };
  }

  const sepayId = payload.id;
  if (sepayId == null || typeof sepayId !== "number") {
    return { ok: false, reason: "missing_id" };
  }

  const amount = payload.transferAmount;
  if (amount == null || typeof amount !== "number") {
    return { ok: false, reason: "missing_amount" };
  }

  const gatewayTxnId = `sepay-${sepayId}`;
  const supabase = createServerClient();

  const { data: existingPay } = await supabase
    .from("payments")
    .select("id")
    .eq("gateway_transaction_id", gatewayTxnId)
    .maybeSingle();
  if (existingPay) {
    return { ok: true, reason: "already_processed" };
  }

  const haystack = [
    payload.content ?? "",
    payload.description ?? "",
    payload.code != null ? String(payload.code) : "",
    payload.referenceCode ?? "",
  ]
    .join(" ")
    .toUpperCase();

  const { data: pendingRows } = await supabase
    .from("vietqr_pending_orders")
    .select("id, payment_code, member_id, plan_id, amount_vnd")
    .is("fulfilled_at", null)
    .gt("expires_at", new Date().toISOString());

  if (!pendingRows?.length) {
    return { ok: true, reason: "no_pending" };
  }

  const match = pendingRows.find(
    (row) =>
      haystack.includes(String(row.payment_code).toUpperCase()) &&
      amountsMatchVnd(amount, row.amount_vnd as number)
  );

  if (!match) {
    return { ok: true, reason: "no_match" };
  }

  const fulfill = await fulfillMembershipGatewayPayment(supabase, {
    memberId: match.member_id as string,
    planId: match.plan_id as string,
    paidAmountVnd: amount,
    gatewayTransactionId: gatewayTxnId,
    method: "vietqr_auto",
  });

  if (!fulfill.ok) {
    if (fulfill.kind === "duplicate") {
      return { ok: true, reason: "already_fulfilled" };
    }
    console.warn("sepay fulfill failed", fulfill.kind, match);
    return { ok: false, reason: fulfill.kind };
  }

  await supabase
    .from("vietqr_pending_orders")
    .update({ fulfilled_at: new Date().toISOString(), sepay_transaction_id: sepayId })
    .eq("id", match.id);

  return { ok: true };
}
