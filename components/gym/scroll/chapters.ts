/**
 * Single source of truth for /gym in-page chapters.
 * Hash-aware navigation and scroll/camera/atmosphere targets.
 *
 * Chapter progress map: intro 0.05, gym 0.35, community 0.65, membership 0.9
 */

export type GymChapter = "intro" | "gym" | "community" | "membership";

export const CHAPTER_PROGRESS: Record<GymChapter, number> = {
  intro: 0.05,
  gym: 0.35,
  community: 0.65,
  membership: 0.9,
};

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
  intro: {
    hash: "#intro",
    progress: CHAPTER_PROGRESS.intro,
    labelVi: "Giới thiệu",
    labelEn: "About",
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
  gym: {
    hash: "#gym",
    progress: CHAPTER_PROGRESS.gym,
    labelVi: "Phòng Leo",
    labelEn: "Gym",
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
    progress: CHAPTER_PROGRESS.community,
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
  membership: {
    hash: "#membership",
    progress: CHAPTER_PROGRESS.membership,
    labelVi: "Thành viên",
    labelEn: "Membership",
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
  "#intro": "intro",
  "#gym": "gym",
  "#community": "community",
  "#membership": "membership",
};

export function getChapterFromHash(hash: string): GymChapter | null {
  const normalized = hash?.trim() || "";
  return HASH_TO_CHAPTER[normalized] ?? null;
}

export function getChapterHash(chapter: GymChapter): string {
  return CHAPTERS[chapter].hash;
}
