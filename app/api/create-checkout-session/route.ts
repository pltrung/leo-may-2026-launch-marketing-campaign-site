import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/emailNormalize";
import { deltaUsdToReachTier } from "@/lib/tiers";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-01-28.clover" }) : null;

/**
 * POST /api/create-checkout-session
 * Body: { target_tier: number (2-6), identifier?: string, identifier_type?: 'email'|'phone' }
 * OR use email/phone from query for lookup.
 * Requires: user's waitlist row must exist and be verified.
 * Returns: { url: string } for Stripe Checkout redirect.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const targetTier = typeof body.target_tier === "number" ? Math.min(6, Math.max(2, Math.floor(body.target_tier))) : 0;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : undefined;
    const identifierType = body.identifier_type === "email" || body.identifier_type === "phone" ? body.identifier_type : undefined;

    if (targetTier < 2 || targetTier > 6) {
      return NextResponse.json({ error: "Invalid target_tier" }, { status: 400 });
    }

    const supabase = createServerClient();

    const normalizedId =
      identifierType === "email" && identifier
        ? normalizeEmail(identifier)
        : identifierType === "phone" && identifier
          ? identifier.trim().replace(/\s+/g, "")
          : identifier?.trim();

    type WaitlistRow = { id: string; total_contribution_usd: number; is_verified: boolean };
    let row: WaitlistRow | null = null;

    if (normalizedId && identifierType) {
      const { data } = await supabase
        .from("waitlist")
        .select("id, total_contribution_usd, is_verified")
        .eq("identifier_type", identifierType)
        .eq("identifier", normalizedId)
        .maybeSingle();
      row = data as WaitlistRow | null;
    }

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (row.is_verified !== true) {
      return NextResponse.json({ error: "Only verified users can upgrade" }, { status: 403 });
    }

    const currentTotal = typeof row.total_contribution_usd === "number" ? row.total_contribution_usd : 0;
    const deltaUsd = deltaUsdToReachTier(currentTotal, targetTier);

    if (deltaUsd <= 0) {
      return NextResponse.json({ error: "Already at or above this tier" }, { status: 400 });
    }

    const amountCents = deltaUsd * 100;
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const locale =
      (body.locale === "vi" || body.locale === "en" ? body.locale : null) ?? (request.nextUrl.searchParams.get("locale") || "en");
    const successUrl = `${origin}/${locale}/countdown?upgrade=success`;
    const cancelUrl = `${origin}/${locale}/countdown`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Tier ${targetTier} – Leo Mây`,
              description: `Upgrade to Tier ${targetTier} ($${deltaUsd} contribution)`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        waitlist_id: row.id,
        target_tier: String(targetTier),
        user_identifier: identifier ?? "",
      },
    });

    if (session.id) {
      await supabase
        .from("waitlist")
        .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    const url = session.url ?? null;
    if (!url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Create checkout session error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment error" },
      { status: 500 }
    );
  }
}
