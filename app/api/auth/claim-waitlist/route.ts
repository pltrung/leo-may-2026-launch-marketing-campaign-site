import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { EVOLUTION_LEVELS } from "@/lib/evolutionLevels";
import { normalizeEmail } from "@/lib/emailNormalize";
import { toE164 } from "@/lib/phoneE164";

function tierFromTierLevel(level: number): string {
  const idx = Math.max(0, Math.min(5, level - 1));
  return EVOLUTION_LEVELS[idx]?.nameEn ?? "Explorer";
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type WaitlistRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  auth_id: string | null;
  tier_level: number | null;
};

/** Allow only http(s) origins so redirect goes to the app the user is on (not localhost when on prod). */
function parseClientOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/claim-waitlist
 * Body: { email?: string, phone?: string, locale?: string, origin?: string }
 * origin: optional client origin (e.g. window.location.origin) so magic link redirects to the same site.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; phone?: string; locale?: string; origin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim().replace(/\s/g, "") : "";
  const phone = rawPhone ? toE164(rawPhone) : "";
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";
  const clientOrigin = parseClientOrigin(body.origin);

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    let waitlistRow: WaitlistRow | null = null;

    if (email) {
      const { data } = await supabase
        .from("waitlist")
        .select("id, name, email, phone, auth_id, tier_level")
        .eq("email", email)
        .maybeSingle();
      waitlistRow = (data as unknown) as WaitlistRow | null;
    }
    if (!waitlistRow && phone) {
      const { data } = await supabase
        .from("waitlist")
        .select("id, name, email, phone, auth_id, tier_level")
        .eq("phone", phone)
        .maybeSingle();
      if (!data) {
        const { data: byE164 } = await supabase
          .from("waitlist")
          .select("id, name, email, phone, auth_id, tier_level")
          .eq("phone", rawPhone)
          .maybeSingle();
        waitlistRow = (byE164 as unknown) as WaitlistRow | null;
      } else {
        waitlistRow = (data as unknown) as WaitlistRow | null;
      }
    }

    if (!waitlistRow) {
      // User not in waitlist; may still have a gym account (member_profiles only, e.g. SQL-seeded).
      if (email) {
        const { data: memberRow } = await supabase
          .from("member_profiles")
          .select("email, auth_id")
          .eq("email", email)
          .maybeSingle();
        if (memberRow?.auth_id) {
          return NextResponse.json({
            status: "has_account",
            hasAccount: true,
            email: (memberRow.email ?? email).trim() || undefined,
          });
        }
      }
      return NextResponse.json({ status: "not_found", error: "Not found in waitlist" }, { status: 404 });
    }

    const authId = waitlistRow.auth_id ?? null;
    const waitlistEmail = waitlistRow.email?.trim() || null;

    if (authId) {
      return NextResponse.json({
        status: "has_account",
        hasAccount: true,
        email: waitlistEmail || undefined,
      });
    }

    if (!waitlistEmail) {
      return NextResponse.json(
        { error: "Waitlist entry has no email; use Create Account instead" },
        { status: 400 }
      );
    }

    const tempPassword = randomPassword();
    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email: waitlistEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr || !authUser?.user) {
      console.error("Claim waitlist createUser error:", createErr);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const { error: updateWaitlistErr } = await supabase
      .from("waitlist")
      .update({ auth_id: authUser.user.id, updated_at: new Date().toISOString() })
      .eq("id", waitlistRow.id);

    if (updateWaitlistErr) {
      console.error("Claim waitlist update waitlist error:", updateWaitlistErr);
    }

    const tier = tierFromTierLevel(typeof waitlistRow.tier_level === "number" ? waitlistRow.tier_level : 1);
    const { error: insertMemberErr } = await supabase.from("member_profiles").insert({
      auth_id: authUser.user.id,
      email: waitlistRow.email ?? null,
      phone: waitlistRow.phone ?? null,
      full_name: waitlistRow.name ?? "Member",
      tier,
    });

    if (insertMemberErr) {
      console.error("Claim waitlist insert member_profiles error:", insertMemberErr);
    }

    const origin =
      clientOrigin ??
      (request.headers.get("x-forwarded-host") && request.headers.get("x-forwarded-proto")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : null) ??
      request.headers.get("origin") ??
      (typeof request.url === "string" ? new URL(request.url).origin : "");
    const redirectTo = `${origin}/${locale}/dashboard`;

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: waitlistEmail,
      options: { redirectTo },
    });

    if (linkErr) {
      console.error("Claim waitlist generateLink error:", linkErr);
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 });
    }

    const url = (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
    if (!url) {
      return NextResponse.json({ error: "No link in response" }, { status: 500 });
    }

    return NextResponse.json({ status: "created_account", url, magicLinkUrl: url });
  } catch (e) {
    console.error("Claim waitlist error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
