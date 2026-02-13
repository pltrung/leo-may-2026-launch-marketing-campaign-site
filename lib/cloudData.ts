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
}

export const clouds: CloudPersonality[] = [
  { id: "may_nhe", name: "Mây Nhẹ", mood: "Inhale" },
  { id: "suong_mu", name: "Sương Mù", mood: "Balance" },
  { id: "giong", name: "Giông", mood: "Commit" },
  { id: "ho_may", name: "Hố Mây", mood: "Imagine" },
  { id: "cau_vong", name: "Cầu Vồng", mood: "Play" },
  { id: "gio", name: "Gió", mood: "Breathe" },
];
