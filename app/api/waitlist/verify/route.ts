import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * POST /api/waitlist/verify
 * After OTP verification: link auth user to waitlist (upsert by email/phone or insert new).
 * Body: { name, cloud_type, email?, phone? }
 * Header: Authorization: Bearer <access_token>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const cloud_type = typeof body.cloud_type === "string" ? body.cloud_type.trim() : "";
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim().replace(/\s/g, "") : null;

    if (!name || !cloud_type || (!email && !phone)) {
      return NextResponse.json({ error: "name, cloud_type, and email or phone required" }, { status: 400 });
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const supabase = createServerClient();

    let existing = null;
    if (email) {
      const { data } = await supabase.from("waitlist").select("id, referral_code, referred_by").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
      existing = data;
    }
    if (!existing && phone) {
      const { data } = await supabase.from("waitlist").select("id, referral_code, referred_by").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();
      existing = data;
    }

    const now = new Date().toISOString();
    if (existing) {
      const { error: updateError } = await supabase
        .from("waitlist")
        .update({
          auth_id: user.id,
          is_verified: true,
          verified_at: now,
          updated_at: now,
          name,
          cloud_type,
        })
        .eq("id", existing.id);
      if (updateError) {
        console.error("Waitlist verify update error:", updateError);
        return NextResponse.json({ error: "Failed to verify" }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        referral_code: (existing as { referral_code?: string }).referral_code ?? null,
        referral_count: 0,
      });
    }

    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const { error: insertError } = await supabase.from("waitlist").insert({
        name,
        email,
        phone,
        cloud_type,
        auth_id: user.id,
        is_verified: true,
        verified_at: now,
        referral_code: referralCode,
        referral_count: 0,
      });
      if (!insertError) {
        return NextResponse.json({ ok: true, referral_code: referralCode, referral_count: 0 });
      }
      if (insertError.code === "23505") {
        referralCode = generateReferralCode();
        attempts++;
        continue;
      }
      console.error("Waitlist verify insert error:", insertError);
      return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
    }
    return NextResponse.json({ error: "Please try again" }, { status: 500 });
  } catch (err) {
    console.error("Waitlist verify error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
