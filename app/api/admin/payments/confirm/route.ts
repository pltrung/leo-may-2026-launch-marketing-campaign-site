import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * POST - Confirm payment and extend membership
 * Body: { member_id, plan_id }
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const planId = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
    if (!memberId || !planId) {
      return NextResponse.json({ error: "member_id and plan_id required" }, { status: 400 });
    }

    const { data: memberRow, error: memberErr } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at")
      .eq("id", memberId)
      .maybeSingle();
    if (memberErr || !memberRow) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const memo = (memberRow.member_code as string | null) ?? memberId;
    const now = new Date();
    let planName: string;
    let amountVnd: number;
    let newExpiry: Date;

    if (planId === "until_end_of_year") {
      planName = "Until end of year";
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      const monthsRemaining = Math.max(1, Math.ceil((endOfYear.getTime() - now.getTime()) / (30 * 86400000)));
      amountVnd = monthsRemaining * 900000;
      newExpiry = endOfYear;
    } else {
      const { data: plan, error: planErr } = await supabase
        .from("membership_plans")
        .select("id, name, duration_days, price_vnd")
        .eq("id", planId)
        .maybeSingle();
      if (planErr || !plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      planName = plan.name as string;
      amountVnd = plan.price_vnd as number;
      const currentExpiry = memberRow.membership_expires_at
        ? new Date(memberRow.membership_expires_at as string)
        : null;
      const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
      newExpiry = new Date(base);
      newExpiry.setDate(newExpiry.getDate() + (plan.duration_days ?? 0));
    }

    const { error: payErr } = await supabase.from("payments").insert({
      member_id: memberId,
      plan_id: planId,
      amount: amountVnd,
      method: "vietqr",
      status: "success",
      memo,
    });
    if (payErr) {
      console.error("payment insert error", payErr);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    const { error: updateErr } = await supabase
      .from("member_profiles")
      .update({
        membership_expires_at: newExpiry.toISOString(),
        membership_status: "active",
        updated_at: now.toISOString(),
      })
      .eq("id", memberId);
    if (updateErr) {
      console.error("member update error", updateErr);
      return NextResponse.json({ error: "Failed to extend membership" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: {
        validUntil: newExpiry.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      },
    });
  } catch (e) {
    console.error("confirm payment error", e);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
