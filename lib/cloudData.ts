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
  mood: string;
  story: string;
  joinLabel: string;
  /** Primary accent color - used for glow, border, button, title */
  accentHex: string;
  /** Story text = accent at 80% opacity (slightly lighter) */
  storyHex: string;
  /** Join button text - dark for light accents (e.g. yellow), white otherwise */
  joinTextHex?: string;
}

export const clouds: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    nameEn: "The Gentle Explorer",
    mood: "leo mây",
    story:
      "You move with curiosity, not ego. Strength can be soft. You climb for joy, not applause.",
    joinLabel: "Join Mây Nhẹ",
    accentHex: "#4FA3FF",
    storyHex: "rgba(79, 163, 255, 0.8)",
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    nameEn: "The Silent Balance",
    mood: "leo mây",
    story:
      "You are calm under pressure. You move with balance. Precision is your quiet strength.",
    joinLabel: "Join Sương Mù",
    accentHex: "#8FA3B8",
    storyHex: "rgba(143, 163, 184, 0.8)",
  },
  {
    id: "giong",
    name: "Giông",
    nameEn: "The Storm Seeker",
    mood: "leo mây",
    story: "You crave intensity. You commit fully. You turn fear into fuel.",
    joinLabel: "Join Giông",
    accentHex: "#0242FF",
    storyHex: "rgba(2, 66, 255, 0.8)",
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    nameEn: "The Deep Thinker",
    mood: "leo mây",
    story:
      "You see paths others don't. You imagine beyond limits. You thrive upside down.",
    joinLabel: "Join Hố Mây",
    accentHex: "#8C7F73",
    storyHex: "rgba(140, 127, 115, 0.8)",
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    nameEn: "The Joy Bringer",
    mood: "leo mây",
    story: "You bring energy to every climb. You play. You inspire.",
    joinLabel: "Join Cầu Vồng",
    accentHex: "#F2C94C",
    storyHex: "rgba(242, 201, 76, 0.85)",
    joinTextHex: "#1a1508",
  },
  {
    id: "gio",
    name: "Gió",
    nameEn: "The Rhythm Mover",
    mood: "leo mây",
    story:
      "You move with rhythm. You breathe through challenge. You train with intention.",
    joinLabel: "Join Gió",
    accentHex: "#4CAF78",
    storyHex: "rgba(76, 175, 120, 0.8)",
  },
];
