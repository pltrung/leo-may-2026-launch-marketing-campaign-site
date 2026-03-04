import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/emailNormalize";
import { EVOLUTION_LEVELS } from "@/lib/evolutionLevels";

const TEST_EMAIL_REGEX = /^ev\d+-.+@l$/;
const TEST_EMAIL_REGEX_2 = /^dummy2\d+@test\.local$/;

type MagicLinkResult = { properties?: { action_link?: string } } | null;

function isTestEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return TEST_EMAIL_REGEX.test(e) || TEST_EMAIL_REGEX_2.test(e);
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function tierFromTierLevel(level: number): string {
  const idx = Math.max(0, Math.min(5, level - 1));
  return EVOLUTION_LEVELS[idx]?.nameEn ?? "Explorer";
}

type WaitlistRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  auth_id: string | null;
  is_verified?: boolean;
  tier_level: number | null;
};

/**
 * Dev-only: bypass OTP for gym login using the same test accounts as countdown.
 * Allowed when:
 * - NEXT_PUBLIC_DEV_BYPASS_OTP=true (local/preview), or
 * - Request host is a Vercel preview (*.vercel.app) and email is a test account (so testing on Vercel works without setting env).
 * Production (e.g. leo-may-2026.com) does not allow bypass unless the env is set.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; locale?: string; origin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";
  const clientOrigin =
    typeof body.origin === "string" && body.origin.trim() && /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(body.origin.trim())
      ? (() => {
          try {
            return new URL(body.origin.trim()).origin;
          } catch {
            return null;
          }
        })()
      : null;

  if (!email || !isTestEmail(email)) {
    return NextResponse.json({ error: "Invalid or non-test email" }, { status: 400 });
  }

  const envBypass =
    typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isVercelPreview = /\.vercel\.app$/i.test(host) || host.includes("vercel.app");
  const devBypass = envBypass || (isVercelPreview && isTestEmail(email));
  if (!devBypass) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createServerClient();

    const { data: waitlistData, error: wErr } = await supabase
      .from("waitlist")
      .select("id, name, email, phone, auth_id, is_verified, tier_level")
      .eq("email", email)
      .maybeSingle();

    if (wErr) {
      console.error("Dev bypass gym waitlist lookup error:", wErr);
      return NextResponse.json({ error: "Waitlist lookup failed" }, { status: 500 });
    }
    const waitlistRow = (waitlistData as unknown) as WaitlistRow | null;
    if (!waitlistRow) {
      return NextResponse.json(
        { error: "Test account not in waitlist. Run supabase seeds: seed_evolution_stages.sql then seed_verify_test_accounts.sql" },
        { status: 404 }
      );
    }
    if (waitlistRow.is_verified !== true) {
      return NextResponse.json(
        { error: "Account not verified. Run seed_verify_test_accounts.sql or migration 008_test_accounts_verified.sql" },
        { status: 403 }
      );
    }

    const origin =
      clientOrigin ??
      (request.headers.get("x-forwarded-host") && request.headers.get("x-forwarded-proto")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : null) ??
      request.headers.get("origin") ??
      (typeof request.url === "string" ? new URL(request.url).origin : "");
    // Use a path (e.g. /en/dashboard) so the hash is preserved; add this URL to Supabase Auth → URL Configuration → Redirect URLs
    const redirectTo = `${origin}/${locale}/dashboard`;

    let linkData: MagicLinkResult = null;
    let linkErr: { message?: string } | null = null;

    const { data: genData, error: genError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    linkData = genData as unknown as MagicLinkResult;
    linkErr = genError;

    if (linkErr) {
      const msg = (linkErr as { message?: string }).message ?? "";
      const userNotFound =
        /user not found|requested user does not exist|not found/i.test(msg);
      if (userNotFound) {
        const tempPassword = randomPassword();
        const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });
        if (createErr || !authUser?.user) {
          console.error("Dev bypass gym createUser error:", createErr);
          return NextResponse.json({ error: "Failed to create test user" }, { status: 500 });
        }
        await supabase
          .from("waitlist")
          .update({ auth_id: authUser.user.id, updated_at: new Date().toISOString() })
          .eq("id", waitlistRow.id);
        const tier = tierFromTierLevel(typeof waitlistRow.tier_level === "number" ? waitlistRow.tier_level : 1);
        await supabase.from("member_profiles").insert({
          auth_id: authUser.user.id,
          email: waitlistRow.email ?? null,
          phone: waitlistRow.phone ?? null,
          full_name: waitlistRow.name ?? "Member",
          tier,
        });
        const { data: retryData, error: retryErr } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        if (retryErr) {
          console.error("Dev bypass gym generateLink retry error:", retryErr);
          return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
        }
        linkData = retryData as unknown as MagicLinkResult;
      } else {
        console.error("Dev bypass gym generateLink error:", linkErr);
        return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
      }
    }

    const url = (linkData as MagicLinkResult)?.properties?.action_link ?? null;
    if (!url) {
      return NextResponse.json({ error: "No link in response" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Dev bypass gym error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
