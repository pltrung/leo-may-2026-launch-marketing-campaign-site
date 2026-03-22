import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { toE164 } from "@/lib/phoneE164";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getTwilioClient() {
  if (!accountSid || !authToken || !verifySid) {
    throw new Error("Missing Twilio env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID");
  }
  return twilio(accountSid, authToken);
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

/** Synthetic email for phone-only users (required for generateLink) */
function syntheticEmail(phone: string): string {
  const safe = phone.replace(/\D/g, "");
  return `phone_${safe}@auth.verify.local`;
}

/**
 * POST /api/verify-otp
 * Verifies OTP via Twilio Verify, creates/fetches Supabase user, returns magic link for session.
 * Body: { phone, code, redirectTo?, name?, cloud_type? } — name/cloud_type for countdown waitlist verify
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = toE164(rawPhone);
    const code = typeof body.code === "string" ? body.code.trim().replace(/\D/g, "") : "";
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const cloud_type = typeof body.cloud_type === "string" ? body.cloud_type.trim() : "";

    if (!phone || !phone.startsWith("+")) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }
    if (!code || code.length < 4) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const client = getTwilioClient();
    const check = await client.verify.v2
      .services(verifySid!)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const serverSupabase = createServerClient();

    // Try to find existing user by phone (waitlist first, then auth.users)
    let authUserId: string | null = null;

    const { data: waitlistRow } = await serverSupabase
      .from("waitlist")
      .select("auth_id")
      .eq("phone", phone)
      .not("auth_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (waitlistRow && (waitlistRow as { auth_id?: string }).auth_id) {
      authUserId = (waitlistRow as { auth_id: string }).auth_id;
    }

    if (!authUserId) {
      const { data: rpcData } = await serverSupabase.rpc("get_auth_user_id_by_phone", {
        p_phone: phone,
      });
      authUserId = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    }

    let user: { id: string; email?: string | null } | null = null;

    if (authUserId) {
      const { data: userData } = await supabase.auth.admin.getUserById(authUserId);
      user = userData?.user ?? null;
    }

    if (!user) {
      const synthEmail = syntheticEmail(phone);
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        phone,
        email: synthEmail,
        phone_confirm: true,
        email_confirm: true,
      });
      if (createErr) {
        if (createErr.message?.toLowerCase().includes("already") || createErr.message?.toLowerCase().includes("duplicate")) {
          const { data: rpcData } = await serverSupabase.rpc("get_auth_user_id_by_phone", {
            p_phone: phone,
          });
          const uid = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          if (uid) {
            const { data: userData } = await supabase.auth.admin.getUserById(uid);
            user = userData?.user ?? null;
          }
        }
        if (!user) {
          console.error("verify-otp createUser error:", createErr);
          return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
        }
      } else {
        user = createData.user;
      }
    }

    const emailForLink = user.email && user.email.includes("@") ? user.email : syntheticEmail(phone);
    if (!user.email || !user.email.includes("@")) {
      await supabase.auth.admin.updateUserById(user.id, { email: emailForLink, email_confirm: true });
    }

    const origin =
      req.headers.get("x-forwarded-host") && req.headers.get("x-forwarded-proto")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
        : req.headers.get("origin") || (typeof req.url === "string" ? new URL(req.url).origin : "");
    const finalRedirect = redirectTo
      ? (redirectTo.startsWith("http") ? redirectTo : `${origin}${redirectTo.startsWith("/") ? "" : "/"}${redirectTo}`)
      : `${origin}/`;

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: emailForLink,
      options: { redirectTo: finalRedirect },
    });

    if (linkErr) {
      console.error("verify-otp generateLink error:", linkErr);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const url = (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
    if (!url) {
      return NextResponse.json({ error: "No link generated" }, { status: 500 });
    }

    // Countdown flow: update waitlist with auth_id and is_verified
    if (name && cloud_type) {
      const { data: existing } = await serverSupabase
        .from("waitlist")
        .select("id")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date().toISOString();
      if (existing) {
        await serverSupabase
          .from("waitlist")
          .update({
            auth_id: user.id,
            is_verified: true,
            verified_at: now,
            updated_at: now,
            name,
            cloud_type,
          })
          .eq("id", (existing as { id: string }).id);
      } else {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let referralCode = "";
        for (let i = 0; i < 8; i++) referralCode += chars[Math.floor(Math.random() * chars.length)];
        await serverSupabase.from("waitlist").insert({
          name,
          phone,
          cloud_type,
          auth_id: user.id,
          is_verified: true,
          verified_at: now,
          referral_code: referralCode,
          referral_count: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      url,
      userId: user.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
