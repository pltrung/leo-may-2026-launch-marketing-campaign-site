/**
 * GET /api/admin/acquisition/time-to-convert
 * Median/average time from first touch -> signup -> purchase -> first check-in.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest, canAccessAnalytics } from "@/lib/unifiedAdminAuth";
import { getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";
import type { TimeHorizon } from "@/lib/admin/analytics/periodUtils";

function parseDateRange(from: string | null, to: string | null, horizon: string | null) {
  if (horizon && ["wtd", "mtd", "qtd", "ytd"].includes(horizon)) {
    const r = getPeriodRange(horizon as TimeHorizon);
    return { since: r.since, until: r.until };
  }
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { since: getGymStartOfDay(from), until: getGymEndOfDay(to) };
  }
  const r = getPeriodRange("mtd");
  return { since: r.since, until: r.until };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || !canAccessAnalytics(unified.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { since, until } = parseDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    url.searchParams.get("horizon")
  );

  const supabase = createServerClient();

  const [attrRes, membersRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from("marketing_attribution")
      .select("user_id, first_touch_at")
      .not("user_id", "is", null)
      .gte("first_touch_at", since)
      .lte("first_touch_at", until),
    supabase.from("member_profiles").select("id, created_at").gte("created_at", since).lte("created_at", until),
    supabase
      .from("payments")
      .select("member_id, created_at")
      .eq("status", "success")
      .gte("created_at", since)
      .lte("created_at", until)
      .order("created_at", { ascending: true }),
    supabase
      .from("gym_checkins")
      .select("member_id, timestamp")
      .gte("timestamp", since)
      .lte("timestamp", until)
      .order("timestamp", { ascending: true }),
  ]);

  const attrByUser = new Map(
    (attrRes.data ?? []).map((r: { user_id: string; first_touch_at: string }) => [r.user_id, r.first_touch_at])
  );
  const memberCreatedAt = new Map(
    (membersRes.data ?? []).map((r: { id: string; created_at: string }) => [r.id, r.created_at])
  );
  const firstPaymentByMember = new Map<string, string>();
  for (const p of (paymentsRes.data ?? []) as { member_id: string; created_at: string }[]) {
    if (!firstPaymentByMember.has(p.member_id)) firstPaymentByMember.set(p.member_id, p.created_at);
  }
  const firstCheckinByMember = new Map<string, string>();
  for (const c of (checkinsRes.data ?? []) as { member_id: string; timestamp: string }[]) {
    if (!firstCheckinByMember.has(c.member_id)) firstCheckinByMember.set(c.member_id, c.timestamp);
  }

  const touchToSignup: number[] = [];
  const signupToPurchase: number[] = [];
  const purchaseToCheckin: number[] = [];
  const touchToCheckin: number[] = [];

  for (const [uid, createdAt] of Array.from(memberCreatedAt.entries())) {
    const touchAt = attrByUser.get(uid);
    if (!touchAt) continue;
    const touchMs = new Date(touchAt).getTime();
    const signupMs = new Date(createdAt).getTime();
    touchToSignup.push((signupMs - touchMs) / 86400000);

    const payAt = firstPaymentByMember.get(uid);
    if (payAt) {
      const payMs = new Date(payAt).getTime();
      signupToPurchase.push((payMs - signupMs) / 86400000);

      const checkAt = firstCheckinByMember.get(uid);
      if (checkAt) {
        const checkMs = new Date(checkAt).getTime();
        purchaseToCheckin.push((checkMs - payMs) / 86400000);
        touchToCheckin.push((checkMs - touchMs) / 86400000);
      }
    }
  }

  return NextResponse.json({
    first_touch_to_signup: { median_days: Math.round(median(touchToSignup) * 100) / 100, avg_days: Math.round(avg(touchToSignup) * 100) / 100, count: touchToSignup.length },
    signup_to_purchase: { median_days: Math.round(median(signupToPurchase) * 100) / 100, avg_days: Math.round(avg(signupToPurchase) * 100) / 100, count: signupToPurchase.length },
    purchase_to_first_checkin: { median_days: Math.round(median(purchaseToCheckin) * 100) / 100, avg_days: Math.round(avg(purchaseToCheckin) * 100) / 100, count: purchaseToCheckin.length },
    first_touch_to_first_checkin: { median_days: Math.round(median(touchToCheckin) * 100) / 100, avg_days: Math.round(avg(touchToCheckin) * 100) / 100, count: touchToCheckin.length },
  });
}
