import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { waitlistSchema } from "@/lib/validators";
import { normalizeEmail } from "@/lib/emailNormalize";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, phone, cloud_type, referred_by } = parsed.data;

    const emailNormalized = email?.trim() ? normalizeEmail(email.trim().toLowerCase()) : null;
    const phoneNormalized = phone?.trim() ? phone.trim().replace(/\s/g, "") : null;
    const referralCode = randomUUID().replace(/-/g, "").slice(0, 12);

    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
    );
    if (!hasUrl || !hasKey) {
      console.error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)");
      return NextResponse.json(
        { error: "Server misconfigured. Please contact support." },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    let referrerId: string | null = null;
    if (referred_by?.trim()) {
      const { data: refRow } = await supabase
        .from("waitlist")
        .select("id")
        .eq("referral_code", referred_by.trim())
        .maybeSingle();
      referrerId = refRow?.id ?? null;
    }

    const identifierType = emailNormalized ? "email" : phoneNormalized ? "phone" : null;
    const identifierValue = emailNormalized ?? phoneNormalized ?? null;

    const insertPayload: Record<string, unknown> = {
      name: name.trim(),
      email: emailNormalized,
      phone: phoneNormalized,
      cloud_type: cloud_type.trim(),
      referral_code: referralCode,
      referral_count: 0,
    };
    if (identifierValue) insertPayload.identifier = identifierValue;
    if (identifierType) insertPayload.identifier_type = identifierType;
    if (referrerId) insertPayload.referred_by = referrerId;

    const { error } = await supabase.from("waitlist").insert(insertPayload);

    if (error) {
      console.error("Waitlist insert error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already used this email/phone." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    // Referral count is NOT incremented here. It is only incremented when the referred
    // user verifies and confirm_referral is called (RPC or /api/referrals/claim).

    // Fetch total count and team count for confirmation
    const [totalRes, teamRes] = await Promise.all([
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .eq("cloud_type", cloud_type.trim()),
    ]);

    const totalCount = totalRes.count ?? 0;
    const teamCount = teamRes.count ?? 0;
    const position = totalCount; // New user is last
    const percentage =
      totalCount > 0 ? Math.round((teamCount / totalCount) * 100) : 100;

    return NextResponse.json({
      ok: true,
      position,
      teamCount,
      totalCount,
      percentage,
      referralCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { error: message.includes("env") ? "Server misconfigured." : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
