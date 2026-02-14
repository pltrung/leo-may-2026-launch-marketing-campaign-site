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
  mood: string;
  story: string;
  joinLabel: string;
  /** Tailwind bg class for card (subtle tone) */
  bgClass: string;
  /** Tailwind text class for front name */
  textClass: string;
  /** Tailwind bg class for buttons */
  accentClass: string;
  /** Hex for border/accent (e.g. #7eb8e8) */
  accentHex: string;
  /** Brighter hex for neon glow that pops on blue background */
  glowHex: string;
  /** Text color for Join button - must contrast with blue cloud */
  joinTextHex: string;
}

export const clouds: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    mood: "leo mây",
    story:
      "You move with curiosity, not ego. Strength can be soft. You climb for joy, not applause.",
    joinLabel: "Join Mây Nhẹ",
    bgClass: "bg-[#2d3a52]",
    textClass: "text-[#b8d4f0]",
    accentClass: "bg-[#7eb8e8]",
    accentHex: "#7eb8e8",
    glowHex: "#5eb8ff",
    joinTextHex: "#ffffff",
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    mood: "leo mây",
    story:
      "You are calm under pressure. You move with balance. Precision is your quiet strength.",
    joinLabel: "Join Sương Mù",
    bgClass: "bg-[#3d4450]",
    textClass: "text-[#d1d5db]",
    accentClass: "bg-[#9ba5ad]",
    accentHex: "#9ba5ad",
    glowHex: "#c8d4e0",
    joinTextHex: "#ffffff",
  },
  {
    id: "giong",
    name: "Giông",
    mood: "leo mây",
    story: "You crave intensity. You commit fully. You turn fear into fuel.",
    joinLabel: "Join Giông",
    bgClass: "bg-[#1e2a44]",
    textClass: "text-white",
    accentClass: "bg-[#3b5998]",
    accentHex: "#3b5998",
    glowHex: "#8ab4ff",
    joinTextHex: "#ffffff",
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    mood: "leo mây",
    story:
      "You see paths others don't. You imagine beyond limits. You thrive upside down.",
    joinLabel: "Join Hố Mây",
    bgClass: "bg-[#3d3d3c]",
    textClass: "text-[#e5e5e4]",
    accentClass: "bg-[#8b8b8a]",
    accentHex: "#8b8b8a",
    glowHex: "#b8a88a",
    joinTextHex: "#ffffff",
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    mood: "leo mây",
    story: "You bring energy to every climb. You play. You inspire.",
    joinLabel: "Join Cầu Vồng",
    bgClass: "bg-[#4a4235]",
    textClass: "text-[#f5e6c8]",
    accentClass: "bg-[#e6b84a]",
    accentHex: "#e6b84a",
    glowHex: "#ffd966",
    joinTextHex: "#1a1508",
  },
  {
    id: "gio",
    name: "Gió",
    mood: "leo mây",
    story:
      "You move with rhythm. You breathe through challenge. You train with intention.",
    joinLabel: "Join Gió",
    bgClass: "bg-[#354035]",
    textClass: "text-[#c5d9c4]",
    accentClass: "bg-[#6b8c68]",
    accentHex: "#6b8c68",
    glowHex: "#88dd88",
    joinTextHex: "#ffffff",
  },
];
