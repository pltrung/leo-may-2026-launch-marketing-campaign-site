import type { SupabaseClient } from "@supabase/supabase-js";

/** 50% off these passes for 7 days after newbie class session ends. */
export const NEWBIE_GRADUATE_SALE_PLAN_IDS = ["month_pass", "half_year_pass", "year_pass"] as const;
export const NEWBIE_GRADUATE_SALE_MS = 7 * 24 * 60 * 60 * 1000;
export const NEWBIE_GRADUATE_DISCOUNT_PERCENT = 50;

export function roundSalePriceVnd(fullPriceVnd: number): number {
  const half = fullPriceVnd / 2;
  return Math.max(0, Math.round(half / 1000) * 1000);
}

/**
 * Sale window starts when the member's newbie coaching session ends (end_time),
 * and lasts 7 days. Uses the most recent completed session if multiple bookings exist.
 */
export async function getNewbieGraduateSaleWindow(
  supabase: SupabaseClient,
  memberId: string,
  now: Date = new Date()
): Promise<{ active: boolean; startedAt: string | null; endsAt: string | null }> {
  const { data: bookings, error } = await supabase
    .from("newbie_class_bookings")
    .select("coaching_session_id")
    .eq("member_id", memberId);
  if (error || !bookings?.length) {
    return { active: false, startedAt: null, endsAt: null };
  }
  const sessionIds = Array.from(new Set(bookings.map((b) => b.coaching_session_id as string)));
  const { data: sessions } = await supabase
    .from("coaching_sessions")
    .select("end_time")
    .in("id", sessionIds);
  if (!sessions?.length) {
    return { active: false, startedAt: null, endsAt: null };
  }
  const endTimes = sessions
    .map((s) => new Date(s.end_time as string).getTime())
    .filter((t) => !Number.isNaN(t));
  if (!endTimes.length) return { active: false, startedAt: null, endsAt: null };
  const nowMs = now.getTime();
  const completedEnds = endTimes.filter((t) => t <= nowMs);
  if (completedEnds.length === 0) {
    return { active: false, startedAt: null, endsAt: null };
  }
  const lastCompletedEnd = Math.max(...completedEnds);
  const endsAtMs = lastCompletedEnd + NEWBIE_GRADUATE_SALE_MS;
  if (nowMs > endsAtMs) {
    return { active: false, startedAt: null, endsAt: null };
  }
  return {
    active: true,
    startedAt: new Date(lastCompletedEnd).toISOString(),
    endsAt: new Date(endsAtMs).toISOString(),
  };
}

export function isNewbieGraduateSalePlan(planId: string): boolean {
  return (NEWBIE_GRADUATE_SALE_PLAN_IDS as readonly string[]).includes(planId);
}

/** Membership tier plans that accept email-campaign % discount (not visit packs or newbie class). */
export const CAMPAIGN_MEMBERSHIP_DISCOUNT_PLAN_IDS = [
  "day_pass",
  "month_pass",
  "half_year_pass",
  "year_pass",
] as const;

export function isCampaignMembershipDiscountPlan(planId: string): boolean {
  return (CAMPAIGN_MEMBERSHIP_DISCOUNT_PLAN_IDS as readonly string[]).includes(planId);
}

export function roundDiscountedPriceVnd(fullPriceVnd: number, percentOff: number): number {
  if (percentOff <= 0) return fullPriceVnd;
  const raw = fullPriceVnd * ((100 - percentOff) / 100);
  return Math.max(0, Math.round(raw / 1000) * 1000);
}

/** After successful purchase of a discounted tier plan, clear stored campaign discount. */
export function shouldClearCampaignMembershipDiscount(planId: string, isVisitPassPackage: boolean): boolean {
  if (isVisitPassPackage) return false;
  return isCampaignMembershipDiscountPlan(planId);
}

export type EffectivePriceForPlanResult = {
  chargeVnd: number;
  saleActive: boolean;
  saleEndsAt: string | null;
  campaign_membership_sale: { discount_percent: number; until: string } | null;
  newbie_graduate_sale: { discount_percent: number; ends_at: string | null } | null;
};

export async function effectivePriceForPlan(
  supabase: SupabaseClient,
  memberId: string,
  planId: string,
  listPriceVnd: number,
  now?: Date
): Promise<EffectivePriceForPlanResult> {
  const t = now ?? new Date();

  const { data: discRow } = await supabase
    .from("member_profiles")
    .select("campaign_membership_discount_percent, campaign_membership_discount_until")
    .eq("id", memberId)
    .maybeSingle();

  let chargeVnd = listPriceVnd;
  let campaignSale: { discount_percent: number; until: string } | null = null;
  const pct = discRow?.campaign_membership_discount_percent as number | null | undefined;
  const untilRaw = discRow?.campaign_membership_discount_until as string | null | undefined;
  const until = untilRaw ? new Date(untilRaw) : null;

  if (
    isCampaignMembershipDiscountPlan(planId) &&
    pct != null &&
    pct > 0 &&
    until &&
    !Number.isNaN(until.getTime()) &&
    until.getTime() > t.getTime()
  ) {
    const campaignCharge = roundDiscountedPriceVnd(listPriceVnd, pct);
    campaignSale = { discount_percent: pct, until: until.toISOString() };
    chargeVnd = Math.min(chargeVnd, campaignCharge);
  }

  let newbieSale: { discount_percent: number; ends_at: string | null } | null = null;
  if (isNewbieGraduateSalePlan(planId)) {
    const win = await getNewbieGraduateSaleWindow(supabase, memberId, t);
    if (win.active && win.endsAt) {
      const newbieCharge = roundSalePriceVnd(listPriceVnd);
      newbieSale = { discount_percent: NEWBIE_GRADUATE_DISCOUNT_PERCENT, ends_at: win.endsAt };
      chargeVnd = Math.min(chargeVnd, newbieCharge);
    }
  }

  const saleActive = chargeVnd < listPriceVnd;
  let saleEndsAt: string | null = null;
  if (campaignSale && newbieSale?.ends_at) {
    saleEndsAt =
      new Date(campaignSale.until).getTime() <= new Date(newbieSale.ends_at).getTime()
        ? campaignSale.until
        : newbieSale.ends_at;
  } else {
    saleEndsAt = campaignSale?.until ?? newbieSale?.ends_at ?? null;
  }

  return {
    chargeVnd,
    saleActive,
    saleEndsAt,
    campaign_membership_sale: campaignSale,
    newbie_graduate_sale: newbieSale,
  };
}

/** VNPay / bank amount check: paid amount must match expected charge (within 1 VND). */
export function amountsMatchVnd(paidVnd: number, expectedVnd: number): boolean {
  return Math.abs(paidVnd - expectedVnd) <= 1;
}
