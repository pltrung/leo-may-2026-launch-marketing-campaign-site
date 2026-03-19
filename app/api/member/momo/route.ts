import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { momoCreatePayment, isMomoConfigured } from "@/lib/momo";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";
import { MEMBERSHIP_GATEWAY_PLANS } from "@/lib/fulfillGatewayMembership";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function publicBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

/**
 * GET ?plan_id=xxx&return_url=xxx
 * Returns { pay_url, deeplink?, qr_code_url? } for MoMo wallet payment.
 */
export async function GET(req: NextRequest) {
  if (!isMomoConfigured()) {
    return NextResponse.json({ error: "MoMo not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planId = req.nextUrl.searchParams.get("plan_id")?.trim();
  const returnUrl = req.nextUrl.searchParams.get("return_url")?.trim();

  if (!planId || !MEMBERSHIP_GATEWAY_PLANS.includes(planId as (typeof MEMBERSHIP_GATEWAY_PLANS)[number])) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  const base = publicBaseUrl(req);
  const defaultReturn = `${base}/en/dashboard`;
  const finalReturn = returnUrl || defaultReturn;

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id, member_code, membership_expires_at, visits_remaining")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const memberId = member.id as string;
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("id, name, price_vnd, duration_days, duration_visits")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const durationVisits = (plan.duration_visits as number | null) ?? 0;
    const isVisitPass = durationVisits > 0;
    const currentVisits = (member.visits_remaining as number) ?? 0;
    const hasActiveVisitPass = currentVisits > 0;
    const expiresAt = member.membership_expires_at
      ? new Date(member.membership_expires_at as string)
      : null;
    const hasActiveDayPass = expiresAt && expiresAt.getTime() > Date.now();
    if (hasActiveVisitPass && !isVisitPass) {
      return NextResponse.json(
        { error: "Active visit pass: cannot buy day pass" },
        { status: 400 }
      );
    }
    if (hasActiveDayPass && !hasActiveVisitPass && isVisitPass) {
      return NextResponse.json(
        { error: "Visit pass only when membership inactive" },
        { status: 400 }
      );
    }

    const listPriceVnd = plan.price_vnd as number;
    const { chargeVnd, saleActive, saleEndsAt } = await effectivePriceForPlan(
      supabase,
      memberId,
      planId,
      listPriceVnd
    );
    const orderId = `LM${memberId.replace(/-/g, "").slice(0, 10)}${Date.now()}`;
    const requestId = randomUUID();
    const orderInfo = `${memberId}|${planId}`;

    const created = await momoCreatePayment({
      orderId,
      requestId,
      amountVnd: chargeVnd,
      orderInfo,
      redirectUrl: finalReturn,
      ipnUrl: `${base}/api/momo-ipn`,
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.message }, { status: 502 });
    }

    return NextResponse.json({
      pay_url: created.payUrl,
      deeplink: created.deeplink,
      qr_code_url: created.qrCodeUrl,
      plan_name: plan.name,
      price_vnd: chargeVnd,
      list_price_vnd: saleActive ? listPriceVnd : undefined,
      newbie_graduate_sale: saleActive
        ? { discount_percent: 50, ends_at: saleEndsAt }
        : undefined,
      order_id: orderId,
    });
  } catch (e) {
    console.error("member momo error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
