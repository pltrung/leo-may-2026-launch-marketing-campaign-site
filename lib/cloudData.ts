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
}

export const clouds: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    mood: "leo mây",
    story:
      "You move with curiosity, not ego. Strength can be soft. You climb for joy, not applause.",
    joinLabel: "Join Mây Nhẹ",
    bgClass: "bg-[#d4e4f7]/40",
    textClass: "text-[#a8c9e8]",
    accentClass: "bg-[#7eb8e8]",
    accentHex: "#7eb8e8",
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    mood: "leo mây",
    story:
      "You are calm under pressure. You move with balance. Precision is your quiet strength.",
    joinLabel: "Join Sương Mù",
    bgClass: "bg-[#e8eaed]/40",
    textClass: "text-[#b8bcc2]",
    accentClass: "bg-[#9ba5ad]",
    accentHex: "#9ba5ad",
  },
  {
    id: "giong",
    name: "Giông",
    mood: "leo mây",
    story: "You crave intensity. You commit fully. You turn fear into fuel.",
    joinLabel: "Join Giông",
    bgClass: "bg-[#1a2744]/80",
    textClass: "text-white",
    accentClass: "bg-[#3b5998]",
    accentHex: "#3b5998",
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    mood: "leo mây",
    story:
      "You see paths others don't. You imagine beyond limits. You thrive upside down.",
    joinLabel: "Join Hố Mây",
    bgClass: "bg-[#f0f0ee]/50",
    textClass: "text-[#6b6b6a]",
    accentClass: "bg-[#8b8b8a]",
    accentHex: "#8b8b8a",
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    mood: "leo mây",
    story: "You bring energy to every climb. You play. You inspire.",
    joinLabel: "Join Cầu Vồng",
    bgClass: "bg-[#f5eed9]/60",
    textClass: "text-[#d4a84b]",
    accentClass: "bg-[#e6b84a]",
    accentHex: "#e6b84a",
  },
  {
    id: "gio",
    name: "Gió",
    mood: "leo mây",
    story:
      "You move with rhythm. You breathe through challenge. You train with intention.",
    joinLabel: "Join Gió",
    bgClass: "bg-[#b8c9b5]/50",
    textClass: "text-[#4a5d47]",
    accentClass: "bg-[#6b8c68]",
    accentHex: "#6b8c68",
  },
];
