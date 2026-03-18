import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canCollectMembershipPayment } from "@/lib/unifiedAdminAuth";
import { computeNewExpiry } from "@/lib/membershipExtension";
import { bookNewbieClass } from "@/lib/newbieClassBooking";

/**
 * POST - Confirm payment and extend membership
 * Body: { member_id, plan_id, method?: "vietqr" | "cash" }
 * Allowed: admin, frontdesk, staff (membership pass payment only).
 */
export async function POST(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canCollectMembershipPayment(unified.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const planId = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
    const method = body.method === "cash" ? "cash" : "vietqr";
    if (!memberId || !planId) {
      return NextResponse.json({ error: "member_id and plan_id required" }, { status: 400 });
    }

    const { data: memberRow, error: memberErr } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at, visits_remaining")
      .eq("id", memberId)
      .maybeSingle();
    if (memberErr || !memberRow) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const memo = (memberRow.member_code as string | null) ?? memberId;
    const now = new Date();

    const { data: plan, error: planErr } = await supabase
      .from("membership_plans")
      .select("id, name, duration_days, duration_visits, price_vnd")
      .eq("id", planId)
      .maybeSingle();
    if (planErr || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const planName = plan.name as string;
    const amountVnd = plan.price_vnd as number;
    const durationVisits = (plan.duration_visits as number | null) ?? 0;
    const durationDays = (plan.duration_days as number) ?? 0;
    const isVisitPass = durationVisits > 0;
    const currentVisits = (memberRow.visits_remaining as number) ?? 0;
    const hasActiveVisitPass = currentVisits > 0;
    const expiresAt = memberRow.membership_expires_at ? new Date(memberRow.membership_expires_at as string) : null;
    const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
    if (hasActiveVisitPass && !isVisitPass) {
      return NextResponse.json({ error: "Member has active visit pass. Can only add more visit passes." }, { status: 400 });
    }
    if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
      return NextResponse.json({ error: "Member has active day pass. Visit passes can only be purchased when inactive." }, { status: 400 });
    }

    const currentExpiry = memberRow.membership_expires_at
      ? new Date(memberRow.membership_expires_at as string)
      : null;
    const newVisits = isVisitPass ? currentVisits + durationVisits : currentVisits;

    const isNewbieClass = planId === "newbie_class";
    const { data: insertedPayment, error: payErr } = await supabase
      .from("payments")
      .insert({
        member_id: memberId,
        plan_id: planId,
        amount: amountVnd,
        method,
        status: "success",
        memo,
      })
      .select("id")
      .single();
    if (payErr) {
      console.error("payment insert error", payErr);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
    const paymentId = insertedPayment?.id ?? null;

    if (isNewbieClass && paymentId) {
      await bookNewbieClass(supabase, memberId, paymentId);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: now.toISOString(),
    };
    if (isVisitPass) {
      updatePayload.visits_remaining = newVisits;
      updatePayload.membership_status = "active";
    } else {
      const newExpiryDay = computeNewExpiry(currentExpiry, durationDays, now);
      updatePayload.membership_expires_at = newExpiryDay.toISOString();
      updatePayload.membership_status = "active";
    }
    const { error: updateErr } = await supabase
      .from("member_profiles")
      .update(updatePayload)
      .eq("id", memberId);
    if (updateErr) {
      console.error("member update error", updateErr);
      return NextResponse.json({ error: "Failed to extend membership" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: {
        validUntil: isVisitPass ? null : computeNewExpiry(currentExpiry, durationDays, now).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        visitsAdded: isVisitPass ? durationVisits : undefined,
      },
    });
  } catch (e) {
    console.error("confirm payment error", e);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
