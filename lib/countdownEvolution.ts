import type { Locale } from "./i18n";

/** Evolution stages by invite (referral) count. */
export const EVOLUTION_STAGES = [
  { min: 0, max: 2, id: "dormant" },
  { min: 3, max: 5, id: "stirring" },
  { min: 6, max: 9, id: "awakening" },
  { min: 10, max: 15, id: "forming" },
  { min: 16, max: 25, id: "ascending" },
  { min: 26, max: 49, id: "sky_guardian" },
  { min: 50, max: Infinity, id: "founding" },
] as const;

export type EvolutionStageId = (typeof EVOLUTION_STAGES)[number]["id"];

export function getEvolutionStage(inviteCount: number): (typeof EVOLUTION_STAGES)[number] {
  const n = Math.max(0, Math.floor(inviteCount));
  for (const stage of EVOLUTION_STAGES) {
    if (n >= stage.min && n <= stage.max) return stage;
  }
  return EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1];
}

export function getEvolutionStageIndex(inviteCount: number): number {
  const stage = getEvolutionStage(inviteCount);
  return EVOLUTION_STAGES.indexOf(stage);
}

/** Identity rank by stage (same order as EVOLUTION_STAGES). */
const RANKS_EN = [
  "Gentle Explorer",
  "Sky Listener",
  "Cloud Caller",
  "Spirit Awakener",
  "Sky Shaper",
  "Cloud Guardian",
  "Founding Cloud",
];

const RANKS_VI = [
  "Người Khám Phá Dịu Dàng",
  "Người Lắng Nghe Bầu Trời",
  "Người Gọi Mây",
  "Người Đánh Thức Linh Hồn",
  "Người Định Hình Bầu Trời",
  "Thần Hộ Mệnh Mây",
  "Mây Sáng Lập",
];

export function getIdentityRank(stageIndex: number, locale: Locale): string {
  const i = Math.max(0, Math.min(stageIndex, RANKS_EN.length - 1));
  return locale === "vi" ? RANKS_VI[i] : RANKS_EN[i];
}

/** Sky narrative by countdown days remaining. */
export function getSkyNarrativeKey(daysRemaining: number): "quiet" | "stir" | "forming" | "prepares" | "reveals" {
  if (daysRemaining <= 0) return "reveals";
  if (daysRemaining <= 1) return "prepares";
  if (daysRemaining <= 3) return "forming";
  if (daysRemaining <= 7) return "stir";
  return "quiet";
}
