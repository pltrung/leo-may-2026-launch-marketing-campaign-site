/**
 * Lifetime climber levels based on total gym check-ins.
 * Used for progression display and upcoming rewards.
 */

export const CLIMBER_LEVELS = [
  { minVisits: 0, name: "Explorer", nameVi: "Khám phá", icon: "🧭" },
  { minVisits: 10, name: "Sky Walker", nameVi: "Người đi bầu trời", icon: "☁️" },
  { minVisits: 25, name: "Cloud Rider", nameVi: "Cưỡi mây", icon: "🌤️" },
  { minVisits: 50, name: "Storm Climber", nameVi: "Leo bão", icon: "⛅" },
  { minVisits: 100, name: "Summit Master", nameVi: "Bậc thầy đỉnh cao", icon: "🏔️" },
  { minVisits: 250, name: "Legend of Leo Mây", nameVi: "Huyền thoại Leo Mây", icon: "🌟" },
] as const;

export type ClimberLevel = (typeof CLIMBER_LEVELS)[number];

export function getClimberLevel(totalVisits: number): ClimberLevel {
  const n = Math.max(0, Math.floor(totalVisits));
  for (let i = CLIMBER_LEVELS.length - 1; i >= 0; i--) {
    if (n >= CLIMBER_LEVELS[i].minVisits) return CLIMBER_LEVELS[i];
  }
  return CLIMBER_LEVELS[0];
}

export function getNextClimberLevel(totalVisits: number): ClimberLevel | null {
  const current = getClimberLevel(totalVisits);
  const idx = CLIMBER_LEVELS.indexOf(current);
  if (idx < 0 || idx >= CLIMBER_LEVELS.length - 1) return null;
  return CLIMBER_LEVELS[idx + 1];
}

/** Progress within current level: visits in this level and visits needed for next. */
export function getLevelProgress(totalVisits: number): {
  currentLevel: ClimberLevel;
  nextLevel: ClimberLevel | null;
  visitsInLevel: number;
  visitsToNextLevel: number;
  progressPercent: number;
} {
  const currentLevel = getClimberLevel(totalVisits);
  const nextLevel = getNextClimberLevel(totalVisits);
  const currentMin = currentLevel.minVisits;
  const nextMin = nextLevel?.minVisits ?? currentMin;
  const visitsInLevel = totalVisits - currentMin;
  const visitsToNextLevel = nextLevel ? nextMin - totalVisits : 0;
  const range = nextMin - currentMin;
  const progressPercent = range > 0 ? Math.min(100, (totalVisits - currentMin) / range * 100) : 100;
  return {
    currentLevel,
    nextLevel,
    visitsInLevel,
    visitsToNextLevel: Math.max(0, visitsToNextLevel),
    progressPercent,
  };
}

/** Level-based rewards at each visit threshold (aligned with milestone system). */
export const LEVEL_REWARDS: Record<number, { reward: string; rewardVi: string }> = {
  10: {
    reward: "1 guest pass code (friend gets 1 free visit)",
    rewardVi: "1 mã vé khách (bạn bè được 1 lượt miễn phí)",
  },
  25: {
    reward: "5 guest pass codes",
    rewardVi: "5 mã vé khách",
  },
  50: {
    reward: "Leo May cap — pick up at front desk",
    rewardVi: "Mũ Leo Mây — nhận tại quầy lễ tân",
  },
  100: {
    reward: "Leo May t-shirt — pick up at front desk",
    rewardVi: "Áo Leo Mây — nhận tại quầy lễ tân",
  },
  250: {
    reward: "Leo May climbing shoes — pick up at front desk",
    rewardVi: "Giày leo Leo Mây — nhận tại quầy lễ tân",
  },
};

export function getNextLevelReward(totalVisits: number): { atVisits: number; reward: string; rewardVi: string } | null {
  const next = getNextClimberLevel(totalVisits);
  if (!next) return null;
  const r = LEVEL_REWARDS[next.minVisits];
  if (!r) return null;
  return { atVisits: next.minVisits, ...r };
}
