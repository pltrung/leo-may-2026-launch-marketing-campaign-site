/**
 * Single source of truth for /gym in-page chapters.
 * Hash-aware navigation and scroll/camera/atmosphere targets.
 * Even spacing so each chapter has similar scroll "length" (intro was too short at 0.05).
 */

export type GymChapter = "intro" | "gym" | "community" | "membership";

export const CHAPTER_PROGRESS: Record<GymChapter, number> = {
  intro: 0.2,
  gym: 0.4,
  community: 0.6,
  membership: 0.85,
};

/** Composition offset so the island sits in the middle zone (not under title or CTA). */
export interface CompositionOffset {
  targetY: number;
  camY: number;
}

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
  /** Offsets applied to camera target.y and pos.y so island stays in middle zone. */
  composition: CompositionOffset;
  atmosphere: {
    tint: string;
    warmth: number;
    cloudDensity: number;
  };
}

/** Pre-launch style: longer scroll so progress moves slower and text stays clear on both mobile and desktop. */
export const GYM_STORY_VH = 560;

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
    composition: { targetY: 0.1, camY: 0.15 },
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
    composition: { targetY: 0.05, camY: 0.1 },
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
    composition: { targetY: 0, camY: 0.08 },
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
    composition: { targetY: 0.02, camY: 0.1 },
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
