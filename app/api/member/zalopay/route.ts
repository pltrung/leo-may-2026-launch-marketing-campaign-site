import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import {
  isZaloPayConfigured,
  zalopayCreateOrder,
  zalopayAppTransIdPrefix,
} from "@/lib/zalopay";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";
import { MEMBERSHIP_GATEWAY_PLANS } from "@/lib/fulfillGatewayMembership";

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
 * Returns { order_url, qr_code?, plan_name, price_vnd }
 */
export async function GET(req: NextRequest) {
  if (!isZaloPayConfigured()) {
    return NextResponse.json({ error: "ZaloPay not configured" }, { status: 503 });
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
  const userReturn = returnUrl || `${base}/en/dashboard`;
  const callbackUrl = `${base}/api/zalopay-callback`;

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
    const pricing = await effectivePriceForPlan(supabase, memberId, planId, listPriceVnd);
    const chargeVnd = pricing.chargeVnd;

    const prefix = zalopayAppTransIdPrefix();
    const app_trans_id = `${prefix}_${memberId.slice(0, 8)}_${Date.now()}`;
    const embed_data = JSON.stringify({
      preferred_payment_method: ["vietqr", "zalopay_wallet"],
      redirecturl: userReturn,
      lm_m: memberId,
      lm_p: planId,
    });
    const item = JSON.stringify([
      {
        itemid: planId,
        itemname: plan.name as string,
        itemprice: chargeVnd,
        itemquantity: 1,
      },
    ]);

    const created = await zalopayCreateOrder({
      app_trans_id,
      app_user: memberId.slice(0, 36),
      amountVnd: chargeVnd,
      description: `Leo May — ${plan.name}`,
      callback_url: callbackUrl,
      embed_data,
      item,
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.message }, { status: 502 });
    }

    return NextResponse.json({
      order_url: created.order_url,
      qr_code: created.qr_code,
      zp_trans_token: created.zp_trans_token,
      app_trans_id,
      plan_name: plan.name,
      price_vnd: chargeVnd,
      list_price_vnd: pricing.saleActive ? listPriceVnd : undefined,
      campaign_membership_sale: pricing.campaign_membership_sale ?? undefined,
      newbie_graduate_sale: pricing.newbie_graduate_sale ?? undefined,
    });
  } catch (e) {
    console.error("member zalopay error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
