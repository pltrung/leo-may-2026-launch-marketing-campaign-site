import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdminOrStaff } from "@/lib/gymOperationsAdminAuth";

/** Desk marks that a first-time visitor was welcomed (ties to dashboard / campaigns). */
export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  if (!memberId) return NextResponse.json({ error: "member_id required" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase
    .from("member_profiles")
    .update({ first_visit_welcomed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
