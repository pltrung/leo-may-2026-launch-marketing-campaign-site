import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/emailNormalize";
import { toE164 } from "@/lib/phoneE164";
import { randomUUID } from "crypto";

const upsertSchema = {
  name: (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 100,
  identifier: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  identifier_type: (v: unknown) => v === "email" || v === "phone",
  cloud_type: (v: unknown) => v === undefined || (typeof v === "string" && v.trim().length > 0),
  referred_by: (v: unknown) => v === undefined || (typeof v === "string" && v.trim().length <= 64),
};

/**
 * POST /api/waitlist/upsert-identity
 * Create or update waitlist row by locked identity (email OR phone).
 * Normalizes: email lowercased (plus-stripped), phone E.164.
 * Does NOT increment referrer's referral_count; that happens on confirm_referral after referred user verifies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const rawId = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const type = body.identifier_type === "email" ? "email" : body.identifier_type === "phone" ? "phone" : null;
    const cloud_type = typeof body.cloud_type === "string" ? body.cloud_type.trim() : undefined;
    const referred_by = typeof body.referred_by === "string" ? body.referred_by.trim() : undefined;

    if (!upsertSchema.name(name) || !upsertSchema.identifier(rawId) || !type) {
      return NextResponse.json(
        { error: "name, identifier, and identifier_type (email|phone) required" },
        { status: 400 }
      );
    }

    const identifier = type === "email"
      ? normalizeEmail(rawId.toLowerCase())
      : toE164(rawId);
    if (!identifier) {
      return NextResponse.json({ error: "Invalid email or phone" }, { status: 400 });
    }

    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const supabase = createServerClient();

    const emailValue = type === "email" ? identifier : null;
    const phoneValue = type === "phone" ? identifier : null;

    const { data: existing } = await supabase
      .from("waitlist")
      .select("id, referral_code, name, cloud_type, referred_by")
      .eq("identifier_type", type)
      .eq("identifier", identifier)
      .maybeSingle();

    let referrerId: string | null = null;
    if (referred_by) {
      const { data: refRow } = await supabase
        .from("waitlist")
        .select("id")
        .eq("referral_code", referred_by)
        .maybeSingle();
      referrerId = refRow?.id ?? null;
    }

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        name,
        updated_at: new Date().toISOString(),
      };
      if (cloud_type) updatePayload.cloud_type = cloud_type;
      if (referrerId !== null) updatePayload.referred_by = referrerId;
      if (emailValue !== null) updatePayload.email = emailValue;
      if (phoneValue !== null) updatePayload.phone = phoneValue;

      const { error: updateErr } = await supabase
        .from("waitlist")
        .update(updatePayload)
        .eq("id", existing.id);
      if (updateErr) {
        console.error("Waitlist upsert-identity update error:", updateErr);
        return NextResponse.json({ error: "Failed to update." }, { status: 500 });
      }
      const [totalRes, teamRes] = await Promise.all([
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("cloud_type", cloud_type || (existing as { cloud_type?: string }).cloud_type || "may_nhe"),
      ]);
      const totalCount = totalRes.count ?? 0;
      const teamCount = teamRes.count ?? 0;
      const position = totalCount;
      const percentage = totalCount > 0 ? Math.round((teamCount / totalCount) * 100) : 100;
      return NextResponse.json({
        ok: true,
        waitlist_id: existing.id,
        referral_code: (existing as { referral_code?: string }).referral_code ?? null,
        position,
        teamCount,
        totalCount,
        percentage,
      });
    }

    const referralCode = randomUUID().replace(/-/g, "").slice(0, 12);
    const insertPayload: Record<string, unknown> = {
      name,
      identifier,
      identifier_type: type,
      email: emailValue,
      phone: phoneValue,
      cloud_type: cloud_type || "may_nhe",
      referral_code: referralCode,
      referral_count: 0,
    };
    if (referrerId) insertPayload.referred_by = referrerId;

    const { data: inserted, error: insertErr } = await supabase
      .from("waitlist")
      .insert(insertPayload)
      .select("id, referral_code")
      .single();

    if (insertErr) {
      console.error("Waitlist upsert-identity insert error:", insertErr);
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "This email or phone is already registered." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
    }

    const finalCloudType = cloud_type || "may_nhe";
    const [totalRes, teamRes] = await Promise.all([
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("cloud_type", finalCloudType),
    ]);
    const totalCount = totalRes.count ?? 0;
    const teamCount = teamRes.count ?? 0;
    const position = totalCount;
    const percentage = totalCount > 0 ? Math.round((teamCount / totalCount) * 100) : 100;

    return NextResponse.json({
      ok: true,
      waitlist_id: inserted?.id ?? null,
      referral_code: (inserted as { referral_code?: string })?.referral_code ?? referralCode,
      position,
      teamCount,
      totalCount,
      percentage,
    });
  } catch (err) {
    console.error("Upsert-identity error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
