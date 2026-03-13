import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

/**
 * POST /api/payment/webhook
 * Called by payment gateway when payment succeeds.
 * Body: {
 *   status: "success",
 *   member_id?: uuid,      // or use member_code
 *   member_code?: string,  // memo from bank transfer
 *   plan_id: string,
 *   amount?: number,       // optional validation
 *   transaction_id?: string  // for idempotency
 * }
 */
export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers.get("x-webhook-secret") ?? "";
  if (secret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    status?: string;
    member_id?: string;
    member_code?: string;
    plan_id?: string;
    amount?: number;
    transaction_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "success") {
    return NextResponse.json({ received: true }); // acknowledge, no action
  }

  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const memberCode = typeof body.member_code === "string" ? body.member_code.trim() : "";
  const planId = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() || undefined : undefined;

  if (!planId) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  let memberRow: { id: string; member_code: string | null; membership_expires_at: string | null } | null = null;

  if (memberId) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at")
      .eq("id", memberId)
      .maybeSingle();
    if (error) {
      console.error("webhook member fetch error", error);
      return NextResponse.json({ error: "Member lookup failed" }, { status: 500 });
    }
    memberRow = data;
  }

  if (!memberRow && memberCode) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at")
      .eq("member_code", memberCode)
      .maybeSingle();
    if (error) {
      console.error("webhook member lookup by code error", error);
      return NextResponse.json({ error: "Member lookup failed" }, { status: 500 });
    }
    memberRow = data;
  }

  if (!memberRow) {
    return NextResponse.json({ error: "Member not found (member_id or member_code required)" }, { status: 404 });
  }

  const now = new Date();
  let planName: string;
  let amountVnd: number;
  let newExpiry: Date;
  const validPlans = ["day_pass", "explorer_month", "explorer_year", "until_end_of_year"];

  if (!validPlans.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

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

  const memo = (memberRow.member_code as string | null) ?? memberRow.id;

  // Idempotency: if transaction_id provided and already exists, skip
  if (transactionId) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_transaction_id", transactionId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ received: true }); // already processed
    }
  }

  const insertPayload: Record<string, unknown> = {
    member_id: memberRow.id,
    plan_id: planId,
    amount: amountVnd,
    method: "gateway",
    status: "success",
    memo,
  };
  if (transactionId) insertPayload.gateway_transaction_id = transactionId;

  const { error: payErr } = await supabase.from("payments").insert(insertPayload);
  if (payErr) {
    if (payErr.code === "23505") {
      return NextResponse.json({ received: true }); // unique violation, already processed
    }
    console.error("payment webhook insert error", payErr);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("member_profiles")
    .update({
      membership_expires_at: newExpiry.toISOString(),
      membership_status: "active",
      updated_at: now.toISOString(),
    })
    .eq("id", memberRow.id);
  if (updateErr) {
    console.error("webhook member update error", updateErr);
    return NextResponse.json({ error: "Failed to extend membership" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
