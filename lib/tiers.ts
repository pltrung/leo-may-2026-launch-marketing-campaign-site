/**
 * Tier structure for Power Your Cloud paid upgrades.
 * Tier level is computed server-side from total_contribution_usd.
 * All amounts in whole USD.
 *
 * Display model: Tier 0 (FREE) + Tier 1–5 (paid). Backend still uses 1–6.
 * Use backendTierToDisplay / displayTierToBackend for mapping.
 */

/** Single source of truth: Tier 0 (free) through Tier 5. Used by Ascension Timeline and Upgrade Instantly (filter Tier 0 for paid list). */
export interface AscensionTierConfig {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  nameEn: string;
  nameVi: string;
  priceUsd: number;
  rewardEn: string;
  rewardVi: string;
  flavorEn: string;
  flavorVi: string;
}

export const ASCENSION_TIERS: AscensionTierConfig[] = [
  {
    tier: 0,
    nameEn: "Awakening Phase",
    nameVi: "Giai đoạn Thức tỉnh",
    priceUsd: 0,
    rewardEn: "Awakening phase activated",
    rewardVi: "Giai đoạn thức tỉnh được kích hoạt",
    flavorEn: "The first spark.",
    flavorVi: "Tia lửa đầu tiên.",
  },
  {
    tier: 1,
    nameEn: "Rising Current",
    nameVi: "Dòng Thăng",
    priceUsd: 5,
    rewardEn: "Early gym access eligibility",
    rewardVi: "Đủ điều kiện vào gym sớm",
    flavorEn: "Move before the crowd.",
    flavorVi: "Di chuyển trước đám đông.",
  },
  {
    tier: 2,
    nameEn: "Thunder Signal",
    nameVi: "Tín hiệu Sấm",
    priceUsd: 10,
    rewardEn: "Launch event invitation eligibility",
    rewardVi: "Đủ điều kiện thư mời sự kiện ra mắt",
    flavorEn: "Your presence is heard.",
    flavorVi: "Sự hiện diện của bạn được lắng nghe.",
  },
  {
    tier: 3,
    nameEn: "Sky Shaper",
    nameVi: "Người Định Hình Bầu Trời",
    priceUsd: 20,
    rewardEn: "Exclusive founding merchandise eligibility",
    rewardVi: "Đủ điều kiện hàng độc quyền sáng lập",
    flavorEn: "Shape the first Leo Mây.",
    flavorVi: "Định hình Leo Mây đầu tiên.",
  },
  {
    tier: 4,
    nameEn: "Name in the Clouds",
    nameVi: "Tên trong Mây",
    priceUsd: 35,
    rewardEn: "Permanent name recognition inside Leo Mây",
    rewardVi: "Tên vinh danh vĩnh viễn trong Leo Mây",
    flavorEn: "Your name becomes part of the sky.",
    flavorVi: "Tên bạn trở thành một phần bầu trời.",
  },
  {
    tier: 5,
    nameEn: "Founding Circle",
    nameVi: "Vòng Sáng Lập",
    priceUsd: 50,
    rewardEn: "Founding Circle access (permanent legacy engraving in our 1st gym + lifetime founding identity)",
    rewardVi: "Quyền vào Vòng Sáng Lập (khắc danh vĩnh viễn tại gym đầu tiên + bản sắc sáng lập trọn đời)",
    flavorEn: "Legacy, forever.",
    flavorVi: "Di sản, mãi mãi.",
  },
];

/** Paid tiers only (Tier 1–5) for Upgrade Instantly. */
export const PAID_ASCENSION_TIERS = ASCENSION_TIERS.filter((t) => t.tier >= 1);

/** Backend tier (1–6) to display tier (0–5). */
export function backendTierToDisplay(backendTier: number): number {
  return Math.min(5, Math.max(0, Math.floor(backendTier) - 1));
}

/** Display tier (0–5) to backend tier (1–6). Tier 0 stays 1 (free); paid 1–5 -> 2–6. */
export function displayTierToBackend(displayTier: number): number {
  return Math.min(6, Math.max(1, Math.floor(displayTier) + 1));
}

export const TIER_PRICES_USD: Record<number, number> = {
  1: 0,
  2: 5,
  3: 10,
  4: 20,
  5: 35,
  6: 50,
} as const;

export const TIER_LABELS_EN: Record<number, string> = {
  1: ASCENSION_TIERS[0].nameEn,
  2: ASCENSION_TIERS[1].nameEn,
  3: ASCENSION_TIERS[2].nameEn,
  4: ASCENSION_TIERS[3].nameEn,
  5: ASCENSION_TIERS[4].nameEn,
  6: ASCENSION_TIERS[5].nameEn,
} as const;

export const TIER_LABELS_VI: Record<number, string> = {
  1: ASCENSION_TIERS[0].nameVi,
  2: ASCENSION_TIERS[1].nameVi,
  3: ASCENSION_TIERS[2].nameVi,
  4: ASCENSION_TIERS[3].nameVi,
  5: ASCENSION_TIERS[4].nameVi,
  6: ASCENSION_TIERS[5].nameVi,
} as const;

export const TIER_BADGE_LABELS_EN: Record<number, string> = {
  1: `Tier 1 – ${ASCENSION_TIERS[0].nameEn}`,
  2: `Tier 2 – ${ASCENSION_TIERS[1].nameEn}`,
  3: `Tier 3 – ${ASCENSION_TIERS[2].nameEn}`,
  4: `Tier 4 – ${ASCENSION_TIERS[3].nameEn}`,
  5: `Tier 5 – ${ASCENSION_TIERS[4].nameEn}`,
  6: `Tier 6 – ${ASCENSION_TIERS[5].nameEn}`,
} as const;

export const TIER_BADGE_LABELS_VI: Record<number, string> = {
  1: `Tier 1 – ${ASCENSION_TIERS[0].nameVi}`,
  2: `Tier 2 – ${ASCENSION_TIERS[1].nameVi}`,
  3: `Tier 3 – ${ASCENSION_TIERS[2].nameVi}`,
  4: `Tier 4 – ${ASCENSION_TIERS[3].nameVi}`,
  5: `Tier 5 – ${ASCENSION_TIERS[4].nameVi}`,
  6: `Tier 6 – ${ASCENSION_TIERS[5].nameVi}`,
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
