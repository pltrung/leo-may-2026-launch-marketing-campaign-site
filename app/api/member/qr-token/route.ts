import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { createQrToken } from "@/lib/qrTokens";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/qr-token
 * Authorization: Bearer <access_token>
 * Returns a short-lived signed QR token for the current member.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: member, error } = await supabase
      .from("member_profiles")
      .select("id, auth_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const qrToken = createQrToken("member", member.id as string);
    return NextResponse.json({ token: qrToken }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Failed to create QR token" }, { status: 500 });
  }
}

