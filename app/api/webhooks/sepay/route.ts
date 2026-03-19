import { NextRequest, NextResponse } from "next/server";
import {
  verifySepayAuthorization,
  isSepayWebhookConfigured,
  processSepayInboundTransfer,
  type SepayPayload,
} from "@/lib/sepayWebhook";

/**
 * POST /api/webhooks/sepay
 * SePay → WebHooks → Call URL. Auth: API Key → Authorization: Apikey &lt;SEPAY_WEBHOOK_API_KEY&gt;
 * Configure payment-code parsing so the L7xxxxxxxx memo appears in webhook content/code fields.
 */
export async function POST(req: NextRequest) {
  if (!isSepayWebhookConfigured()) {
    return NextResponse.json({ success: false }, { status: 503 });
  }

  if (!verifySepayAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let payload: SepayPayload;
  try {
    payload = (await req.json()) as SepayPayload;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const result = await processSepayInboundTransfer(payload);
  if (!result.ok) {
    return NextResponse.json({ success: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
