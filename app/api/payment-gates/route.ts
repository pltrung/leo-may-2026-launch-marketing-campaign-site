import { NextResponse } from "next/server";
import { isVnPayConfigured } from "@/lib/vnpay";
import { isMomoConfigured } from "@/lib/momo";
import { isZaloPayConfigured } from "@/lib/zalopay";

/** Which card/wallet gateways are configured (no secrets). */
export async function GET() {
  return NextResponse.json({
    vnpay: isVnPayConfigured(),
    momo: isMomoConfigured(),
    zalopay: isZaloPayConfigured(),
  });
}
