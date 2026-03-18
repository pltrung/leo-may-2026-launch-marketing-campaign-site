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

export async function effectivePriceForPlan(
  supabase: SupabaseClient,
  memberId: string,
  planId: string,
  listPriceVnd: number,
  now?: Date
): Promise<{ chargeVnd: number; saleActive: boolean; saleEndsAt: string | null }> {
  const t = now ?? new Date();
  if (!isNewbieGraduateSalePlan(planId)) {
    return { chargeVnd: listPriceVnd, saleActive: false, saleEndsAt: null };
  }
  const win = await getNewbieGraduateSaleWindow(supabase, memberId, t);
  if (!win.active) {
    return { chargeVnd: listPriceVnd, saleActive: false, saleEndsAt: null };
  }
  return {
    chargeVnd: roundSalePriceVnd(listPriceVnd),
    saleActive: true,
    saleEndsAt: win.endsAt,
  };
}

/** VNPay / bank amount check: paid amount must match expected charge (within 1 VND). */
export function amountsMatchVnd(paidVnd: number, expectedVnd: number): boolean {
  return Math.abs(paidVnd - expectedVnd) <= 1;
}
