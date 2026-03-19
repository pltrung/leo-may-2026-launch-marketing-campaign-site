import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const PREFIX = "L7";
const CODE_LEN = 8;
const PENDING_TTL_HOURS = 72;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateVietqrPaymentCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return s;
}

/** Memo embedded in VietQR (short — banks truncate long descriptions). */
export function buildVietqrMemoWithCode(paymentCode: string): string {
  return `${PREFIX}${paymentCode}`;
}

/**
 * Register a bank-transfer intent. QR must use memo_qr so SePay sees the code in transfer content.
 */
export async function insertVietqrPendingOrder(
  supabase: SupabaseClient,
  params: {
    memberId: string;
    planId: string;
    amountVnd: number;
  }
): Promise<{ paymentCode: string; memoQr: string } | null> {
  const paymentCode = generateVietqrPaymentCode();
  const memoQr = buildVietqrMemoWithCode(paymentCode);
  const expiresAt = new Date(Date.now() + PENDING_TTL_HOURS * 3600 * 1000);

  const { error } = await supabase.from("vietqr_pending_orders").insert({
    payment_code: paymentCode,
    member_id: params.memberId,
    plan_id: params.planId,
    amount_vnd: params.amountVnd,
    memo_qr: memoQr,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return insertVietqrPendingOrder(supabase, params);
    }
    console.error("vietqr_pending insert", error);
    return null;
  }

  return { paymentCode, memoQr };
}
