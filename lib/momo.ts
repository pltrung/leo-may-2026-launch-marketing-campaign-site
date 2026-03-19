import crypto from "crypto";

const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE ?? "";
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY ?? "";
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY ?? "";
/** Test: https://test-payment.momo.vn — Prod: https://payment.momo.vn */
const MOMO_ENDPOINT =
  process.env.MOMO_ENDPOINT ?? "https://test-payment.momo.vn/v2/gateway/api/create";

export function isMomoConfigured(): boolean {
  return !!(MOMO_PARTNER_CODE && MOMO_ACCESS_KEY && MOMO_SECRET_KEY);
}

function hmacSha256(data: string, key: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/**
 * MoMo create payment signature (captureWallet)
 */
export function momoCreateSignature(params: {
  accessKey: string;
  amount: string;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}): string {
  const raw = [
    `accessKey=${params.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `ipnUrl=${params.ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${params.partnerCode}`,
    `redirectUrl=${params.redirectUrl}`,
    `requestId=${params.requestId}`,
    `requestType=${params.requestType}`,
  ].join("&");
  return hmacSha256(raw, MOMO_SECRET_KEY);
}

export type MomoCreateResult =
  | { ok: true; payUrl: string; deeplink?: string; qrCodeUrl?: string }
  | { ok: false; message: string };

export async function momoCreatePayment(params: {
  orderId: string;
  requestId: string;
  amountVnd: number;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData?: string;
}): Promise<MomoCreateResult> {
  if (!isMomoConfigured()) {
    return { ok: false, message: "MoMo not configured" };
  }

  const amount = String(Math.round(params.amountVnd));
  const extraData = params.extraData ?? "";
  const requestType = "captureWallet";
  const body = {
    partnerCode: MOMO_PARTNER_CODE,
    accessKey: MOMO_ACCESS_KEY,
    requestId: params.requestId,
    amount,
    orderId: params.orderId,
    orderInfo: params.orderInfo,
    redirectUrl: params.redirectUrl,
    ipnUrl: params.ipnUrl,
    extraData,
    requestType,
    lang: "en",
    signature: momoCreateSignature({
      accessKey: MOMO_ACCESS_KEY,
      amount,
      extraData,
      ipnUrl: params.ipnUrl,
      orderId: params.orderId,
      orderInfo: params.orderInfo,
      partnerCode: MOMO_PARTNER_CODE,
      redirectUrl: params.redirectUrl,
      requestId: params.requestId,
      requestType,
    }),
  };

  try {
    const res = await fetch(MOMO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const resultCode = data.resultCode;
    if (resultCode === 0 && typeof data.payUrl === "string") {
      return {
        ok: true,
        payUrl: data.payUrl,
        deeplink: typeof data.deeplink === "string" ? data.deeplink : undefined,
        qrCodeUrl: typeof data.qrCodeUrl === "string" ? data.qrCodeUrl : undefined,
      };
    }
    const msg =
      typeof data.message === "string" ? data.message : JSON.stringify(data);
    return { ok: false, message: msg };
  } catch (e) {
    console.error("momo create error", e);
    return { ok: false, message: "MoMo request failed" };
  }
}

/** Verify MoMo IPN body signature (wallet payment) */
export function verifyMomoIpnSignature(payload: Record<string, unknown>): boolean {
  if (!MOMO_SECRET_KEY || !MOMO_ACCESS_KEY) return false;
  const accessKey = String(payload.accessKey ?? "");
  const amount = String(payload.amount ?? "");
  const extraData = String(payload.extraData ?? "");
  const message = String(payload.message ?? "");
  const orderId = String(payload.orderId ?? "");
  const orderInfo = String(payload.orderInfo ?? "");
  const orderType = String(payload.orderType ?? "");
  const partnerCode = String(payload.partnerCode ?? "");
  const payType = String(payload.payType ?? "");
  const requestId = String(payload.requestId ?? "");
  const responseTime = String(payload.responseTime ?? "");
  const resultCode = String(payload.resultCode ?? "");
  const transId = String(payload.transId ?? "");
  const received = String(payload.signature ?? "");

  if (!received) return false;

  const raw = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join("&");

  const expected = hmacSha256(raw, MOMO_SECRET_KEY);
  return expected === received;
}
