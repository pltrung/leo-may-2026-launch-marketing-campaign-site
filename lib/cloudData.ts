export type CloudType =
  | "may_nhe"
  | "suong_mu"
  | "giong"
  | "ho_may"
  | "cau_vong"
  | "gio";

export interface CloudPersonality {
  id: CloudType;
  name: string;
  nameEn: string;
  /** Short English for card display e.g. "(Light Cloud)" */
  shortNameEn?: string;
  mood: string;
  story: string;
  joinLabel: string;
  /** Primary accent color - used for glow, border, button, title */
  accentHex: string;
  /** Story text = accent at 80% opacity (slightly lighter) */
  storyHex: string;
  /** Join button text - dark for light accents (e.g. yellow), white otherwise */
  joinTextHex?: string;
  /** Trait message when team reaches threshold */
  traitUnlocked?: string;
  /** Trait threshold (members) - default 50 */
  traitThreshold?: number;
}

export const clouds: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    nameEn: "The Gentle Explorer",
    shortNameEn: "(Light Cloud)",
    mood: "leo mây",
    story:
      "You move with curiosity, not ego. Strength can be soft. You climb for joy, not applause.",
    joinLabel: "Join Mây Nhẹ",
    accentHex: "#4FA3FF",
    storyHex: "rgba(79, 163, 255, 0.8)",
    traitUnlocked: "Your cloud moves with quiet curiosity.",
    traitThreshold: 50,
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    nameEn: "The Silent Balance",
    shortNameEn: "(Mist Cloud)",
    mood: "leo mây",
    story:
      "You are calm under pressure. You move with balance. Precision is your quiet strength.",
    joinLabel: "Join Sương Mù",
    accentHex: "#8FA3B8",
    storyHex: "rgba(143, 163, 184, 0.8)",
    traitUnlocked: "Your cloud moves with quiet precision.",
    traitThreshold: 50,
  },
  {
    id: "giong",
    name: "Giông",
    nameEn: "The Storm Seeker",
    shortNameEn: "(Storm Cloud)",
    mood: "leo mây",
    story: "You crave intensity. You commit fully. You turn fear into fuel.",
    joinLabel: "Join Giông",
    accentHex: "#0242FF",
    storyHex: "rgba(2, 66, 255, 0.8)",
    traitUnlocked: "Your cloud bends but never breaks.",
    traitThreshold: 50,
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    nameEn: "The Deep Thinker",
    shortNameEn: "(Cloud Hollow)",
    mood: "leo mây",
    story:
      "You see paths others don't. You imagine beyond limits. You thrive upside down.",
    joinLabel: "Join Hố Mây",
    accentHex: "#8C7F73",
    storyHex: "rgba(140, 127, 115, 0.8)",
    traitUnlocked: "Your cloud sees paths others don't.",
    traitThreshold: 50,
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    nameEn: "The Joy Bringer",
    shortNameEn: "(Rainbow Cloud)",
    mood: "leo mây",
    story: "You bring energy to every climb. You play. You inspire.",
    joinLabel: "Join Cầu Vồng",
    accentHex: "#F2C94C",
    storyHex: "rgba(242, 201, 76, 0.85)",
    joinTextHex: "#1a1508",
    traitUnlocked: "Your cloud brings energy to every climb.",
    traitThreshold: 50,
  },
  {
    id: "gio",
    name: "Gió",
    nameEn: "The Rhythm Mover",
    shortNameEn: "(Wind Cloud)",
    mood: "leo mây",
    story:
      "You move with rhythm. You breathe through challenge. You train with intention.",
    joinLabel: "Join Gió",
    accentHex: "#4CAF78",
    storyHex: "rgba(76, 175, 120, 0.8)",
    traitUnlocked: "Your cloud moves with rhythm.",
    traitThreshold: 50,
  },
];

export function getCloudById(id: CloudType): CloudPersonality | undefined {
  return clouds.find((c) => c.id === id);
}
