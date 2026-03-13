import crypto from "crypto";

const VNPAY_HOST = process.env.VNPAY_HOST ?? "https://sandbox.vnpayment.vn";
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE ?? "";
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET ?? "";

export function isVnPayConfigured(): boolean {
  return !!(VNPAY_TMN_CODE && VNPAY_HASH_SECRET);
}

/**
 * Verify VNPay IPN/return query params using vnp_SecureHash (HMAC-SHA512)
 */
export function verifyVnPaySecureHash(params: Record<string, string>, secret: string): boolean {
  const secureHash = params.vnp_SecureHash;
  if (!secureHash) return false;

  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "vnp_SecureHash" && k !== "vnp_SecureHashType" && params[k] !== "")
    .sort();

  const hashData = sortedKeys
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(hashData);
  const calculated = hmac.digest("hex");
  return calculated === secureHash;
}

/**
 * Build VNPay payment URL
 * orderInfoFormat: "member_id|plan_id"
 */
export function buildVnPayPaymentUrl(params: {
  amountVnd: number;
  orderInfo: string;
  txnRef: string;
  returnUrl: string;
  ipAddr?: string;
  locale?: "vn" | "en";
}): string | null {
  if (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET) return null;

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Amount: String(params.amountVnd * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: params.locale ?? "en",
    vnp_ReturnUrl: params.returnUrl,
    vnp_IpAddr: params.ipAddr ?? "127.0.0.1",
    vnp_CreateDate: new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14),
  };

  const sortedKeys = Object.keys(vnpParams).sort();
  const hashData = sortedKeys.map((k) => `${k}=${vnpParams[k]}`).join("&");
  const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
  hmac.update(hashData);
  vnpParams.vnp_SecureHash = hmac.digest("hex");

  const query = new URLSearchParams(vnpParams).toString();
  return `${VNPAY_HOST}/paymentv2/vpcpay.html?${query}`;
}
