import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { toE164 } from "@/lib/phoneE164";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

function getClient() {
  if (!accountSid || !authToken || !verifySid) {
    throw new Error("Missing Twilio env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID");
  }
  return twilio(accountSid, authToken);
}

/** Simple in-memory rate limit: phone -> { count, resetAt } */
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(phone);
  if (!entry) return true;
  if (now > entry.resetAt) {
    rateLimit.delete(phone);
    return true;
  }
  return entry.count < RATE_LIMIT_MAX;
}

function incrementRateLimit(phone: string): void {
  const now = Date.now();
  const entry = rateLimit.get(phone);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count++;
  }
}

/**
 * POST /api/send-otp
 * Sends OTP via Twilio Verify (SMS).
 * Body: { phone: string } — E.164 or normalized by toE164
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = toE164(rawPhone);

    if (!phone || !phone.startsWith("+")) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }

    if (!checkRateLimit(phone)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const client = getClient();
    const verification = await client.verify.v2
      .services(verifySid!)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    incrementRateLimit(phone);

    return NextResponse.json({
      success: true,
      status: verification.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send OTP";
    const twilioErr = err as { code?: number; status?: number };
    if (twilioErr.code === 60200 || twilioErr.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }
    console.error("send-otp error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
