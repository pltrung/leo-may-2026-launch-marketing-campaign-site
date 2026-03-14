import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PLAN_NAMES: Record<string, string> = {
  day_pass: "1 Day Pass",
  month_pass: "30 Day Pass",
  year_pass: "365 Day Pass",
  newbie_class: "Newbie Class",
  visit_5: "5 Visit Pass",
  visit_10: "10 Visit Pass",
  visit_20: "20 Visit Pass",
};

/**
 * GET /api/member/payments
 * Authorization: Bearer <token>
 * Returns payment history for the current member
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("payments")
      .select("id, plan_id, amount, method, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("member payments error", error);
      return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
    }

    const payments = (data ?? []).map((p) => ({
      id: p.id,
      plan_name: PLAN_NAMES[p.plan_id as string] ?? p.plan_id,
      amount: p.amount,
      method: p.method,
      created_at: p.created_at,
    }));

    return NextResponse.json({ payments });
  } catch (e) {
    console.error("member payments error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
