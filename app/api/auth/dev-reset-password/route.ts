import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * Dev-only: reset password for an existing auth user (e.g. dummy@gym.local).
 * Use when the user was created via SQL and the password hash doesn't work with Supabase Auth.
 *
 * POST body: { email: string, password: string }
 * Requires: NEXT_PUBLIC_DEV_BYPASS_OTP=true (or Vercel preview host)
 */
export async function POST(request: NextRequest) {
  const envBypass =
    typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isVercelPreview = /\.vercel\.app$/i.test(host) || host.includes("vercel.app");
  if (!envBypass && !isVercelPreview) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const user = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) {
      console.error("Dev reset password error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, email });
  } catch (e) {
    console.error("Dev reset password error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
