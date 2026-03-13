import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST /api/member/waiver
 * Body: { full_name: string, agreed: boolean, signature_data?: string }
 * Sets waiver_signed = true and waiver_signed_at for current member.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const agreed = body.agreed === true;
    const signature = typeof body.signature_data === "string" ? body.signature_data.trim() || null : null;
    const waiverText = typeof body.waiver_text === "string" ? body.waiver_text : null;

    if (!fullName || !agreed) {
      return NextResponse.json(
        { error: "Full name and agreement required" },
        { status: 400 }
      );
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: member, error: memberErr } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (memberErr || !member?.id) {
      console.error("Waiver member lookup error:", memberErr);
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("member_profiles")
      .update({
        waiver_signed: true,
        waiver_signed_at: now,
        full_name: fullName,
        updated_at: now,
      })
      .eq("id", member.id);

    if (updateErr) {
      console.error("Waiver update error:", updateErr);
      return NextResponse.json({ error: "Failed to save waiver" }, { status: 500 });
    }

    if (waiverText) {
      const { error: insertErr } = await supabase.from("member_waivers").insert({
        member_id: member.id,
        full_name: fullName,
        waiver_text: waiverText,
        signature,
      });

      if (insertErr) {
        console.error("Waiver insert error:", insertErr);
        return NextResponse.json({ error: "Failed to save waiver record" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Waiver route error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
