import crypto from "crypto";

const ZALOPAY_APP_ID = process.env.ZALOPAY_APP_ID ?? "";
const ZALOPAY_KEY1 = process.env.ZALOPAY_KEY1 ?? "";
const ZALOPAY_KEY2 = process.env.ZALOPAY_KEY2 ?? "";
const ZALOPAY_ENDPOINT =
  process.env.ZALOPAY_ENDPOINT ?? "https://sb-openapi.zalopay.vn/v2/create";

export function isZaloPayConfigured(): boolean {
  return !!(ZALOPAY_APP_ID && ZALOPAY_KEY1 && ZALOPAY_KEY2);
}

export function zalopayCreateMac(input: string): string {
  return crypto.createHmac("sha256", ZALOPAY_KEY1).update(input).digest("hex");
}

export function zalopayVerifyCallbackMac(dataRaw: string, mac: string): boolean {
  if (!ZALOPAY_KEY2) return false;
  const expected = crypto.createHmac("sha256", ZALOPAY_KEY2).update(dataRaw).digest("hex");
  return expected === mac;
}

export type ZaloPayCreateResult =
  | {
      ok: true;
      order_url: string;
      qr_code?: string;
      zp_trans_token?: string;
    }
  | { ok: false; message: string };

/**
 * Create ZaloPay order (form-urlencoded). Use VietQR + ZaloPay wallet in gateway.
 */
export async function zalopayCreateOrder(params: {
  app_trans_id: string;
  app_user: string;
  amountVnd: number;
  description: string;
  callback_url: string;
  embed_data: string;
  item: string;
}): Promise<ZaloPayCreateResult> {
  if (!isZaloPayConfigured()) {
    return { ok: false, message: "ZaloPay not configured" };
  }

  const app_id = ZALOPAY_APP_ID;
  const app_time = Date.now();
  const amount = String(Math.round(params.amountVnd));
  const macInput = `${app_id}|${params.app_trans_id}|${params.app_user}|${amount}|${app_time}|${params.embed_data}|${params.item}`;
  const mac = zalopayCreateMac(macInput);

  const form = new URLSearchParams();
  form.set("app_id", app_id);
  form.set("app_user", params.app_user);
  form.set("app_time", String(app_time));
  form.set("amount", amount);
  form.set("app_trans_id", params.app_trans_id);
  form.set("embed_data", params.embed_data);
  form.set("item", params.item);
  form.set("description", params.description);
  form.set("callback_url", params.callback_url);
  form.set("bank_code", "");
  form.set("mac", mac);

  try {
    const res = await fetch(ZALOPAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const return_code = Number(data.return_code);
    if (return_code === 1 && typeof data.order_url === "string") {
      return {
        ok: true,
        order_url: data.order_url,
        qr_code: typeof data.qr_code === "string" ? data.qr_code : undefined,
        zp_trans_token: typeof data.zp_trans_token === "string" ? data.zp_trans_token : undefined,
      };
    }
    const msg =
      typeof data.return_message === "string"
        ? data.return_message
        : JSON.stringify(data);
    return { ok: false, message: msg };
  } catch (e) {
    console.error("zalopay create error", e);
    return { ok: false, message: "ZaloPay request failed" };
  }
}

/** yymmdd in Vietnam GMT+7 */
export function zalopayAppTransIdPrefix(): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "00";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}${m}${d}`;
}
