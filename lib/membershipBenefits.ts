import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeGuestCode(): string {
  return `LMG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function insertGuestCodes(
  supabase: SupabaseClient,
  issuerMemberId: string,
  count: number,
  expiresAt: Date,
  paymentId: string | null
): Promise<void> {
  const expiresIso = expiresAt.toISOString();
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeGuestCode();
      const { error } = await supabase.from("member_guest_invite_codes").insert({
        issuer_member_id: issuerMemberId,
        code,
        payment_id: paymentId,
        expires_at: expiresIso,
      });
      if (!error) break;
    }
  }
}

/**
 * Call after extending day membership (month / 180 / 365). Grants codes + merch tier.
 * Extension rules:
 * - month_pass: no codes, no discount change (30d has no extra benefits).
 * - half_year_pass: +5 codes (expire at new membership end), merch discount ≥5% (never below 5 if upgrading from 0).
 * - year_pass: +15 codes, merch discount = 10%.
 */
export async function applyDayPassPurchaseBenefits(
  supabase: SupabaseClient,
  memberId: string,
  planId: string,
  newMembershipExpiresAt: Date,
  paymentId: string | null
): Promise<void> {
  if (planId !== "half_year_pass" && planId !== "year_pass") return;

  if (paymentId) {
    const { count } = await supabase
      .from("member_guest_invite_codes")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId);
    if ((count ?? 0) > 0) return;
  }

  if (planId === "half_year_pass") {
    const { data: row } = await supabase
      .from("member_profiles")
      .select("merchandise_discount_percent")
      .eq("id", memberId)
      .maybeSingle();
    const cur = Math.min(10, Math.max(0, Number(row?.merchandise_discount_percent) || 0));
    const next = Math.max(cur, 5);
    await supabase.from("member_profiles").update({ merchandise_discount_percent: next }).eq("id", memberId);
    await insertGuestCodes(supabase, memberId, 5, newMembershipExpiresAt, paymentId);
  } else if (planId === "year_pass") {
    await supabase.from("member_profiles").update({ merchandise_discount_percent: 10 }).eq("id", memberId);
    await insertGuestCodes(supabase, memberId, 15, newMembershipExpiresAt, paymentId);
  }
}

export function effectiveMerchDiscountPercent(profile: {
  merchandise_discount_percent?: number | null;
  membership_expires_at?: string | null;
  visits_remaining?: number | null;
}): number {
  const stored = Math.min(10, Math.max(0, Number(profile.merchandise_discount_percent) || 0));
  if (stored <= 0) return 0;
  const now = Date.now();
  const dayOk =
    profile.membership_expires_at && new Date(profile.membership_expires_at).getTime() > now;
  const visitOk = (profile.visits_remaining ?? 0) > 0;
  if (!dayOk && !visitOk) return 0;
  return stored;
}

/** Lazy-clear stored discount when member has fully lapsed (no day pass, no visits). */
export async function clearMerchDiscountIfLapsed(
  supabase: SupabaseClient,
  memberId: string,
  profile: {
    merchandise_discount_percent?: number | null;
    membership_expires_at?: string | null;
    visits_remaining?: number | null;
  }
): Promise<void> {
  if (effectiveMerchDiscountPercent(profile) > 0) return;
  if ((profile.merchandise_discount_percent ?? 0) > 0) {
    await supabase.from("member_profiles").update({ merchandise_discount_percent: 0 }).eq("id", memberId);
  }
}
