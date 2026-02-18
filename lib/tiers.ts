/**
 * Tier structure for Power Your Cloud paid upgrades.
 * Tier level is computed server-side from total_contribution_usd.
 * All amounts in whole USD.
 */

export const TIER_PRICES_USD: Record<number, number> = {
  1: 0,
  2: 5,
  3: 10,
  4: 20,
  5: 35,
  6: 50,
} as const;

export const TIER_LABELS_EN: Record<number, string> = {
  1: "Explorer",
  2: "Early Access Badge",
  3: "Exclusive Wallpaper",
  4: "Launch Event Priority",
  5: "Founding Member Status",
  6: "Ultimate Cloud Form",
} as const;

export const TIER_LABELS_VI: Record<number, string> = {
  1: "Khám phá",
  2: "Huy hiệu Early Access",
  3: "Hình nền độc quyền",
  4: "Ưu tiên sự kiện ra mắt",
  5: "Founding Member",
  6: "Hình thái mây tối thượng",
} as const;

export const TIER_BADGE_LABELS_EN: Record<number, string> = {
  1: "Tier 1 – Explorer",
  2: "Tier 2 – Early Access",
  3: "Tier 3 – Founding Explorer",
  4: "Tier 4 – Launch Priority",
  5: "Tier 5 – Founding Member",
  6: "Tier 6 – Ultimate Cloud",
} as const;

export const TIER_BADGE_LABELS_VI: Record<number, string> = {
  1: "Tier 1 – Khám phá",
  2: "Tier 2 – Early Access",
  3: "Tier 3 – Founding Explorer",
  4: "Tier 4 – Ưu tiên ra mắt",
  5: "Tier 5 – Founding Member",
  6: "Tier 6 – Mây tối thượng",
} as const;

/** Amount in USD required to be at least at this tier (cumulative). */
export function tierToMinUsd(tier: number): number {
  return TIER_PRICES_USD[tier as keyof typeof TIER_PRICES_USD] ?? 0;
}

/** Compute tier level (1–6) from total contribution in whole USD. */
export function contributionToTierLevel(totalContributionUsd: number): number {
  const n = Math.max(0, Math.floor(totalContributionUsd));
  if (n >= 50) return 6;
  if (n >= 35) return 5;
  if (n >= 20) return 4;
  if (n >= 10) return 3;
  if (n >= 5) return 2;
  return 1;
}

/** Delta USD to pay to reach target tier from current total (whole USD). */
export function deltaUsdToReachTier(currentTotalUsd: number, targetTier: number): number {
  const required = tierToMinUsd(targetTier);
  return Math.max(0, required - Math.max(0, Math.floor(currentTotalUsd)));
}

/** Tier (1–6) from referral count only; used for MAX(referral_tier, payment_tier). */
export function referralCountToTier(count: number): number {
  const n = Math.max(0, Math.floor(count));
  if (n >= 50) return 6;
  if (n >= 35) return 5;
  if (n >= 20) return 4;
  if (n >= 10) return 3;
  if (n >= 5) return 2;
  return 1;
}

/** Effective tier = max(referral-based tier, payment-based tier). */
export function effectiveTier(referralCount: number, totalContributionUsd: number): number {
  return Math.max(
    referralCountToTier(referralCount),
    contributionToTierLevel(totalContributionUsd)
  );
}
