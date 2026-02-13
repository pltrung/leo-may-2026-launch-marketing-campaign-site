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
  nameVi: string;
  mood: string;
  description: string;
  cta: string;
  tint: "neutral" | "blue" | "yellow" | "green";
}

export const cloudPersonalities: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    nameVi: "The Gentle Explorer",
    mood: "Inhale",
    description:
      "You move with curiosity, not ego.\nStrength can be soft.\nYou climb for joy, not applause.",
    cta: "Begin Lightly",
    tint: "neutral",
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    nameVi: "The Silent Warrior",
    mood: "Balance",
    description:
      "You are a warrior at heart but choose silence.\nYou prove through action, not noise.\nPrecision is your power.",
    cta: "Move Through the Mist",
    tint: "neutral",
  },
  {
    id: "giong",
    name: "Giông",
    nameVi: "The Storm Chaser",
    mood: "Commit",
    description:
      "You crave intensity.\nYou don't fear falling.\nYou turn fear into fuel.",
    cta: "Enter the Storm",
    tint: "blue",
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    nameVi: "The Imaginative Architect",
    mood: "Imagine",
    description:
      "You see routes others don't.\nYou thrive upside down.\nYou solve what looks impossible.",
    cta: "Defy Gravity",
    tint: "neutral",
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    nameVi: "The Playful Catalyst",
    mood: "Play",
    description:
      "You energize the room.\nYou climb with laughter.\nProgress should feel alive.",
    cta: "Chase the Colors",
    tint: "yellow",
  },
  {
    id: "gio",
    name: "Gió",
    nameVi: "The Flow Seeker",
    mood: "Breathe",
    description:
      "You train with intention.\nYou move with rhythm.\nDiscipline feels like breath.",
    cta: "Find Your Flow",
    tint: "green",
  },
];
