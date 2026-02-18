import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabaseServer";
import { contributionToTierLevel } from "@/lib/tiers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-01-28.clover" }) : null;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!webhookSecret || !stripe) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const waitlistId = session.metadata?.waitlist_id;
  if (!waitlistId) {
    return NextResponse.json({ error: "Missing metadata.waitlist_id" }, { status: 400 });
  }

  const amountTotal = session.amount_total ?? 0;
  const amountUsd = Math.floor(amountTotal / 100);

  if (amountUsd <= 0) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient();

  try {
    const { error: insertErr } = await supabase.from("stripe_checkout_completed").insert({
      stripe_session_id: session.id,
      waitlist_id: waitlistId,
      amount_cents: amountTotal,
    });
    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ received: true });
      }
      throw insertErr;
    }
  } catch (e) {
    console.error("Webhook idempotency insert error:", e);
    return NextResponse.json({ error: "Idempotency failed" }, { status: 500 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("waitlist")
    .select("id, total_contribution_usd, contribution_source")
    .eq("id", waitlistId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Waitlist row not found" }, { status: 404 });
  }

  const currentTotal = typeof (row as { total_contribution_usd?: number }).total_contribution_usd === "number"
    ? (row as { total_contribution_usd: number }).total_contribution_usd
    : 0;
  const newTotal = currentTotal + amountUsd;
  const newTier = contributionToTierLevel(newTotal);
  const prevSource = (row as { contribution_source?: string }).contribution_source;
  const contributionSource = prevSource === "referral" || prevSource === "mixed" ? "mixed" : "payment";
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("waitlist")
    .update({
      total_contribution_usd: newTotal,
      tier_level: newTier,
      contribution_source: contributionSource,
      upgraded_at: now,
      updated_at: now,
      stripe_checkout_session_id: session.id,
    })
    .eq("id", waitlistId);

  if (updateErr) {
    console.error("Webhook waitlist update error:", updateErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
