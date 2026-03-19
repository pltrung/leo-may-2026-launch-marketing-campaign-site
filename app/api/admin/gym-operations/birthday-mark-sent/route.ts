import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/gymOperationsAdminAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const year =
    typeof body.year === "number" && body.year >= 2020 && body.year <= 2100
      ? body.year
      : new Date().getFullYear();
  if (!memberId) return NextResponse.json({ error: "member_id required" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase
    .from("member_profiles")
    .update({ birthday_message_sent_year: year, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
