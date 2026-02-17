import type { Locale } from "./i18n";

/**
 * XP-style evolution levels by referral count.
 * Progress bar shows XP within current level toward next form.
 */
export const EVOLUTION_LEVELS = [
  { levelIndex: 0, minReferrals: 0, maxReferrals: 4, nameEn: "Gentle Explorer", nameVi: "Người Khám Phá Dịu Dàng" },
  { levelIndex: 1, minReferrals: 5, maxReferrals: 9, nameEn: "Sky Listener", nameVi: "Người Lắng Nghe Bầu Trời" },
  { levelIndex: 2, minReferrals: 10, maxReferrals: 19, nameEn: "Cloud Shaper", nameVi: "Người Định Hình Mây" },
  { levelIndex: 3, minReferrals: 20, maxReferrals: 34, nameEn: "Sky Influencer", nameVi: "Người Ảnh Hưởng Bầu Trời" },
  { levelIndex: 4, minReferrals: 35, maxReferrals: 49, nameEn: "Founding Cloud", nameVi: "Mây Sáng Lập" },
  { levelIndex: 5, minReferrals: 50, maxReferrals: 74, nameEn: "Celestial Founder", nameVi: "Người Sáng Lập Thiên Thể" },
  { levelIndex: 6, minReferrals: 75, maxReferrals: Infinity, nameEn: "Origin Marker", nameVi: "Dấu Ấn Khởi Nguyên" },
] as const;

export type EvolutionLevel = (typeof EVOLUTION_LEVELS)[number];

export function getEvolutionLevel(referralCount: number): EvolutionLevel {
  const n = Math.max(0, Math.floor(referralCount));
  for (const level of EVOLUTION_LEVELS) {
    if (n >= level.minReferrals && n <= level.maxReferrals) return level;
  }
  return EVOLUTION_LEVELS[EVOLUTION_LEVELS.length - 1];
}

/** XP within current level (0-based count in level). */
export function getXpInLevel(referralCount: number): number {
  const level = getEvolutionLevel(referralCount);
  return Math.max(0, Math.floor(referralCount) - level.minReferrals);
}

/** XP required to complete current level (number of referrals in this level). */
export function getXpRequiredForLevel(referralCount: number): number {
  const level = getEvolutionLevel(referralCount);
  if (level.maxReferrals === Infinity) return 0;
  return level.maxReferrals - level.minReferrals + 1;
}

/** Progress fraction 0..1 for current level; 1 at max level. */
export function getLevelProgressFraction(referralCount: number): number {
  const xpRequired = getXpRequiredForLevel(referralCount);
  if (xpRequired <= 0) return 1;
  const xpIn = getXpInLevel(referralCount);
  return Math.min(1, xpIn / xpRequired);
}

/** Next level (next form); null if at max level. */
export function getNextLevel(referralCount: number): EvolutionLevel | null {
  const current = getEvolutionLevel(referralCount);
  const nextIndex = current.levelIndex + 1;
  if (nextIndex >= EVOLUTION_LEVELS.length) return null;
  return EVOLUTION_LEVELS[nextIndex];
}

export function getLevelName(level: EvolutionLevel, locale: Locale): string {
  return locale === "vi" ? level.nameVi : level.nameEn;
}

export function getNextFormName(referralCount: number, locale: Locale): string | null {
  const next = getNextLevel(referralCount);
  if (!next) return null;
  return getLevelName(next, locale);
}

/** Reward unlocked at each level (levelIndex 0–5). Level 6 (Origin Marker) has no separate reward; top tier is Founding Circle with legacy + lifetime identity. */
export const EVOLUTION_REWARDS = [
  { levelIndex: 0, labelEn: "Awakening phase", labelVi: "Giai đoạn thức tỉnh" },
  { levelIndex: 1, labelEn: "Early gym access eligibility", labelVi: "Đủ điều kiện vào gym sớm" },
  { levelIndex: 2, labelEn: "Launch event invitation eligibility", labelVi: "Đủ điều kiện thư mời sự kiện ra mắt" },
  { levelIndex: 3, labelEn: "Exclusive founding merchandise eligibility", labelVi: "Đủ điều kiện hàng độc quyền sáng lập" },
  { levelIndex: 4, labelEn: "Permanent name recognition inside Leo Mây", labelVi: "Tên vinh danh lâu dài tại Leo Mây" },
  { levelIndex: 5, labelEn: "Founding Circle access (permanent legacy engraving in our 1st gym + lifetime founding identity)", labelVi: "Quyền vào Vòng Sáng Lập (khắc danh vĩnh viễn tại gym đầu tiên + bản sắc sáng lập trọn đời)" },
] as const;

export function getRewardLabel(reward: (typeof EVOLUTION_REWARDS)[number], locale: Locale): string {
  return locale === "vi" ? reward.labelVi : reward.labelEn;
}

/** Whether this reward tier is unlocked at the given level index. Level 6 (Origin Marker) unlocks all 6 rewards. */
export function isRewardUnlocked(rewardLevelIndex: number, currentLevelIndex: number): boolean {
  if (currentLevelIndex >= 6) return true;
  return currentLevelIndex >= rewardLevelIndex;
}
