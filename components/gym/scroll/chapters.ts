/**
 * Single source of truth for /gym in-page chapters.
 * Hash-aware navigation and scroll/camera/atmosphere targets.
 */

export type GymChapter = "gym" | "member" | "community" | "visit";

export interface ChapterDef {
  hash: string;
  progress: number;
  labelVi: string;
  labelEn: string;
  camera: {
    pos: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  atmosphere: {
    tint: string;
    warmth: number;
    cloudDensity: number;
  };
}

export const GYM_STORY_VH = 420;

export const CHAPTERS: Record<GymChapter, ChapterDef> = {
  gym: {
    hash: "#gym",
    progress: 0.1,
    labelVi: "Phòng Leo",
    labelEn: "Gym",
    camera: {
      pos: [0.15, 0.05, 7.2],
      target: [0, 0.34, 0],
      fov: 46,
    },
    atmosphere: {
      tint: "#87CEEB",
      warmth: 0.4,
      cloudDensity: 0.55,
    },
  },
  member: {
    hash: "#member",
    progress: 0.6,
    labelVi: "Thành viên",
    labelEn: "Membership",
    camera: {
      pos: [0.4, 0.12, 5.8],
      target: [0, 0.34, 0],
      fov: 48,
    },
    atmosphere: {
      tint: "#B8D4E8",
      warmth: 0.55,
      cloudDensity: 0.65,
    },
  },
  community: {
    hash: "#community",
    progress: 0.74,
    labelVi: "Cộng đồng",
    labelEn: "Community",
    camera: {
      pos: [-0.25, 0.08, 5.5],
      target: [0, 0.34, 0],
      fov: 50,
    },
    atmosphere: {
      tint: "#E8C4A0",
      warmth: 0.78,
      cloudDensity: 0.6,
    },
  },
  visit: {
    hash: "#visit",
    progress: 0.9,
    labelVi: "Đến thăm",
    labelEn: "Visit",
    camera: {
      pos: [0, 0.06, 5.2],
      target: [0, 0.34, 0],
      fov: 45,
    },
    atmosphere: {
      tint: "#F5E6D3",
      warmth: 0.7,
      cloudDensity: 0.5,
    },
  },
};

const HASH_TO_CHAPTER: Record<string, GymChapter> = {
  "#gym": "gym",
  "#member": "member",
  "#community": "community",
  "#visit": "visit",
};

export function getChapterFromHash(hash: string): GymChapter | null {
  const normalized = hash?.trim() || "";
  return HASH_TO_CHAPTER[normalized] ?? null;
}

export function getChapterHash(chapter: GymChapter): string {
  return CHAPTERS[chapter].hash;
}
