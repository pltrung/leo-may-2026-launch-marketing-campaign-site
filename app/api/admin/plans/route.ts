import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

const PLAN_ORDER = ["newbie_class", "day_pass", "month_pass", "year_pass", "visit_5", "visit_10", "visit_20"];

function passType(planId: string): "newbie" | "day" | "visit" {
  if (planId === "newbie_class") return "newbie";
  if (["day_pass", "month_pass", "year_pass"].includes(planId)) return "day";
  if (["visit_5", "visit_10", "visit_20"].includes(planId)) return "visit";
  return "day";
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, name, duration_days, duration_visits, price_vnd, description");
  if (error) {
    console.error("plans error", error);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
  const excludedIds = ["until_end_of_year", "explorer_month", "explorer_year"];
  const raw = (data ?? []).filter((p) => !excludedIds.includes((p.id as string) ?? ""));
  const byId = new Map(raw.map((p) => [(p.id as string), { ...p, pass_type: passType(p.id as string) }]));
  const plans = PLAN_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  return NextResponse.json({ plans }, { headers: { "Cache-Control": "no-store, max-age=60" } });
}
