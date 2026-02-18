import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST /api/referrals/claim
 * Claim a referral (inviter gets +1) after the referred user is verified.
 * Requires Authorization: Bearer <access_token>.
 * Calls confirm_referral RPC which enforces: caller verified, referrer exists, no self-referral, no duplicate.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ref_code = typeof body.ref_code === "string" ? body.ref_code.trim() : "";
    if (!ref_code) {
      return NextResponse.json({ error: "ref_code required" }, { status: 400 });
    }

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.rpc("confirm_referral", { ref_code });
    if (error) {
      const msg = error.message ?? "Failed to claim referral";
      const status = msg.includes("not_verified") || msg.includes("not_authenticated") ? 403 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    const ok = (data as { ok?: boolean })?.ok === true;
    if (!ok) {
      const err = (data as { error?: string })?.error ?? "Could not claim referral";
      return NextResponse.json({ error: err }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      referral_count: (data as { referral_count?: number }).referral_count ?? 0,
    });
  } catch (err) {
    console.error("Referrals claim error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
