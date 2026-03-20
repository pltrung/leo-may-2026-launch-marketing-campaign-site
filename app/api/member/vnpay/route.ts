import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { buildVnPayPaymentUrl, isVnPayConfigured } from "@/lib/vnpay";
import { effectivePriceForPlan } from "@/lib/newbieGraduateSale";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET ?plan_id=xxx&return_url=xxx
 * Authorization: Bearer <token>
 * Returns VNPay payment URL for member's membership purchase.
 */
export async function GET(req: NextRequest) {
  if (!isVnPayConfigured()) {
    return NextResponse.json({ error: "VNPay not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planId = req.nextUrl.searchParams.get("plan_id")?.trim();
  const returnUrl = req.nextUrl.searchParams.get("return_url")?.trim();
    const validPlans = [
      "day_pass",
      "month_pass",
      "half_year_pass",
      "year_pass",
      "newbie_class",
      "visit_5",
      "visit_10",
      "visit_20",
    ];

  if (!planId || !validPlans.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  const baseUrl = req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
    : req.nextUrl.origin;
  const defaultReturn = `${baseUrl}/en/dashboard`;
  const finalReturnUrl = returnUrl || defaultReturn;

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
      .select("id, member_code, membership_status, membership_expires_at")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { data: plan } = await supabase
      .from("membership_plans")
      .select("id, name, price_vnd")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const planName = plan.name as string;
    const listPriceVnd = plan.price_vnd as number;
    const pricing = await effectivePriceForPlan(supabase, member.id as string, planId, listPriceVnd);
    const priceVnd = pricing.chargeVnd;

    const txnRef = `LM-${member.id.slice(0, 8)}-${Date.now()}`;
    const orderInfo = `${member.id}|${planId}`;

    const paymentUrl = buildVnPayPaymentUrl({
      amountVnd: priceVnd,
      orderInfo,
      txnRef,
      returnUrl: finalReturnUrl,
      locale: "en",
    });

    if (!paymentUrl) {
      return NextResponse.json({ error: "Failed to create payment URL" }, { status: 500 });
    }

    return NextResponse.json({
      url: paymentUrl,
      plan_name: planName,
      price_vnd: priceVnd,
      list_price_vnd: pricing.saleActive ? listPriceVnd : undefined,
      campaign_membership_sale: pricing.campaign_membership_sale ?? undefined,
      newbie_graduate_sale: pricing.newbie_graduate_sale ?? undefined,
      txn_ref: txnRef,
    });
  } catch (e) {
    console.error("member vnpay error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
