import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/emailNormalize";

const TEST_EMAIL_REGEX = /^ev\d+-.+@l$/;
const TEST_EMAIL_REGEX_2 = /^dummy2\d+@test\.local$/;

function isTestEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return TEST_EMAIL_REGEX.test(e) || TEST_EMAIL_REGEX_2.test(e);
}

/**
 * Dev-only: bypass OTP for gym login using the same test accounts as countdown.
 * When NEXT_PUBLIC_DEV_BYPASS_OTP=true and email is a verified test account,
 * returns a magic link that signs the user in and redirects to dashboard.
 */
export async function POST(request: NextRequest) {
  const devBypass =
    typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";
  if (!devBypass) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";

  if (!email || !isTestEmail(email)) {
    return NextResponse.json({ error: "Invalid or non-test email" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data: waitlistRow, error: wErr } = await supabase
      .from("waitlist")
      .select("id, is_verified")
      .eq("email", email)
      .maybeSingle();

    if (wErr || !waitlistRow) {
      return NextResponse.json({ error: "Waitlist lookup failed" }, { status: 500 });
    }
    if (!waitlistRow || (waitlistRow as { is_verified?: boolean }).is_verified !== true) {
      return NextResponse.json({ error: "Account not verified" }, { status: 403 });
    }

    const origin =
      request.headers.get("x-forwarded-host") && request.headers.get("x-forwarded-proto")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : request.headers.get("origin") ?? new URL(request.url).origin;
    const redirectTo = `${origin}/${locale}/dashboard`;

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (linkErr) {
      console.error("Dev bypass gym generateLink error:", linkErr);
      return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
    }

    const url =
      (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
    if (!url) {
      return NextResponse.json({ error: "No link in response" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Dev bypass gym error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
