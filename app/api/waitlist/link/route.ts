import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST /api/waitlist/link
 * After OTP (e.g. "Know your cloud?"): link current auth user to an existing
 * waitlist row by email or phone. For old users created before auth migration.
 * Header: Authorization: Bearer <access_token>
 * Body: none required (uses auth user's email/phone from token).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser?.id) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const email = typeof authUser.email === "string" && authUser.email.trim() ? authUser.email.trim().toLowerCase() : null;
    const phone = typeof authUser.phone === "string" && authUser.phone.trim() ? authUser.phone.trim().replace(/\s/g, "") : null;
    if (!email && !phone) {
      return NextResponse.json({ user: null });
    }

    const supabase = createServerClient();
    type WaitlistRow = {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      cloud_type: string | null;
      referral_code?: string;
      referral_count?: number;
      is_verified?: boolean;
    };
    let row: WaitlistRow | null = null;

    if (email) {
      const { data } = await supabase
        .from("waitlist")
        .select("id, name, email, phone, cloud_type, referral_code, referral_count, is_verified")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = data as WaitlistRow | null;
    }
    if (!row && phone) {
      const { data } = await supabase
        .from("waitlist")
        .select("id, name, email, phone, cloud_type, referral_code, referral_count, is_verified")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = data as WaitlistRow | null;
    }

    if (!row) {
      return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const rowId = row.id;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({
        auth_id: authUser.id,
        is_verified: true,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", rowId);

    if (updateError) {
      console.error("Waitlist link update error:", updateError);
      return NextResponse.json({ user: null }, { status: 500 });
    }

    const cloud = getCloudById((row.cloud_type as CloudType) || "may_nhe");
    if (!cloud) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: row.id,
        name: row.name || "Member",
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        team: row.cloud_type,
        referralCode: row.referral_code ?? undefined,
        referralCount: typeof row.referral_count === "number" ? row.referral_count : 0,
        isVerified: true,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (err) {
    console.error("Waitlist link error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
