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
  /** Short Vietnamese for card display */
  shortNameVi?: string;
  mood: string;
  story: string;
  /** Vietnamese story text */
  storyVi?: string;
  joinLabel: string;
  /** Primary accent color - used for glow, border, button, title */
  accentHex: string;
  /** Story text = accent at 80% opacity (slightly lighter) */
  storyHex: string;
  /** Join button text - dark for light accents (e.g. yellow), white otherwise */
  joinTextHex?: string;
  /** Trait message when team reaches threshold */
  traitUnlocked?: string;
  /** Vietnamese trait message */
  traitUnlockedVi?: string;
  /** Trait threshold (members) - default 50 */
  traitThreshold?: number;
}

export const clouds: CloudPersonality[] = [
  {
    id: "may_nhe",
    name: "Mây Nhẹ",
    nameEn: "The Gentle Explorer",
    shortNameEn: "(Light Cloud)",
    shortNameVi: "(Mây nhẹ)",
    mood: "leo mây",
    story:
      "You move with curiosity, not ego. Strength can be soft. You climb for joy, not applause.",
    storyVi:
      "Bạn di chuyển với sự tò mò, không phải cái tôi. Sức mạnh có thể dịu dàng. Bạn leo vì niềm vui, không phải vỗ tay.",
    joinLabel: "Join Mây Nhẹ",
    accentHex: "#4FA3FF",
    storyHex: "rgba(79, 163, 255, 0.8)",
    traitUnlocked: "Your cloud moves with quiet curiosity.",
    traitUnlockedVi: "Mây của bạn di chuyển với sự tò mò lặng lẽ.",
    traitThreshold: 50,
  },
  {
    id: "suong_mu",
    name: "Sương Mù",
    nameEn: "The Silent Balance",
    shortNameEn: "(Mist Cloud)",
    shortNameVi: "(Mây sương)",
    mood: "leo mây",
    story:
      "You are calm under pressure. You move with balance. Precision is your quiet strength.",
    storyVi:
      "Bạn bình tĩnh dưới áp lực. Bạn di chuyển cân bằng. Độ chính xác là sức mạnh thầm lặng của bạn.",
    joinLabel: "Join Sương Mù",
    accentHex: "#8FA3B8",
    storyHex: "rgba(143, 163, 184, 0.8)",
    traitUnlocked: "Your cloud moves with quiet precision.",
    traitUnlockedVi: "Mây của bạn di chuyển với độ chính xác thầm lặng.",
    traitThreshold: 50,
  },
  {
    id: "giong",
    name: "Giông",
    nameEn: "The Storm Seeker",
    shortNameEn: "(Storm Cloud)",
    shortNameVi: "(Mây giông)",
    mood: "leo mây",
    story: "You crave intensity. You commit fully. You turn fear into fuel.",
    storyVi: "Bạn khao khát cường độ. Bạn cam kết trọn vẹn. Bạn biến nỗi sợ thành nhiên liệu.",
    joinLabel: "Join Giông",
    accentHex: "#FF635C",
    storyHex: "rgba(255, 99, 92, 0.8)",
    traitUnlocked: "Your cloud bends but never breaks.",
    traitUnlockedVi: "Mây của bạn uốn cong nhưng không bao giờ gãy.",
    traitThreshold: 50,
  },
  {
    id: "ho_may",
    name: "Hố Mây",
    nameEn: "The Deep Thinker",
    shortNameEn: "(Cloud Hollow)",
    shortNameVi: "(Hố mây)",
    mood: "leo mây",
    story:
      "You see paths others don't. You imagine beyond limits. You thrive upside down.",
    storyVi:
      "Bạn thấy lối đi mà người khác không thấy. Bạn tưởng tượng vượt giới hạn. Bạn phát triển ngược.",
    joinLabel: "Join Hố Mây",
    accentHex: "#8C7F73",
    storyHex: "rgba(140, 127, 115, 0.8)",
    traitUnlocked: "Your cloud sees paths others don't.",
    traitUnlockedVi: "Mây của bạn thấy lối đi mà người khác không thấy.",
    traitThreshold: 50,
  },
  {
    id: "cau_vong",
    name: "Cầu Vồng",
    nameEn: "The Joy Bringer",
    shortNameEn: "(Rainbow Cloud)",
    shortNameVi: "(Mây cầu vồng)",
    mood: "leo mây",
    story: "You bring energy to every climb. You play. You inspire.",
    storyVi: "Bạn mang năng lượng đến mỗi lần leo. Bạn chơi. Bạn truyền cảm hứng.",
    joinLabel: "Join Cầu Vồng",
    accentHex: "#F2C94C",
    storyHex: "rgba(242, 201, 76, 0.85)",
    joinTextHex: "#1a1508",
    traitUnlocked: "Your cloud brings energy to every climb.",
    traitUnlockedVi: "Mây của bạn mang năng lượng đến mỗi lần leo.",
    traitThreshold: 50,
  },
  {
    id: "gio",
    name: "Gió",
    nameEn: "The Rhythm Mover",
    shortNameEn: "(Wind Cloud)",
    shortNameVi: "(Mây gió)",
    mood: "leo mây",
    story:
      "You move with rhythm. You breathe through challenge. You train with intention.",
    storyVi:
      "Bạn di chuyển theo nhịp điệu. Bạn thở qua thử thách. Bạn luyện tập có chủ đích.",
    joinLabel: "Join Gió",
    accentHex: "#4CAF78",
    storyHex: "rgba(76, 175, 120, 0.8)",
    traitUnlocked: "Your cloud moves with rhythm.",
    traitUnlockedVi: "Mây của bạn di chuyển theo nhịp điệu.",
    traitThreshold: 50,
  },
];

export function getCloudById(id: CloudType): CloudPersonality | undefined {
  return clouds.find((c) => c.id === id);
}
