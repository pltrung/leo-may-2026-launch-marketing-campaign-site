import type { CloudType } from "./cloudData";

/** Species-specific colors for mascot SVG parts (eye, ribbon, cloud outline). High contrast on blue sky #0242FF. */
export interface MascotPartColors {
  eyeLeft: string;
  eyeRight: string;
  ribbon: string;
  cloudOutline: string;
}

/** All 6 cloud types with mascot colors (aligned to cloudData accent / theme):
 *  may_nhe   – light blue (Light Cloud)
 *  suong_mu  – grey/slate (Mist)
 *  giong     – green (Storm; green for visibility on blue sky)
 *  ho_may    – taupe (Cloud Hollow)
 *  cau_vong  – yellow/gold (Rainbow)
 *  gio       – green (Wind)
 */
const SPECIES_COLORS: Record<CloudType, MascotPartColors> = {
  may_nhe: {
    eyeLeft: "#6FD3FF",
    eyeRight: "#6FD3FF",
    ribbon: "#4FB7FF",
    cloudOutline: "#5BBEFF",
  },
  suong_mu: {
    eyeLeft: "#CFCFCF",
    eyeRight: "#CFCFCF",
    ribbon: "#D9D9D9",
    cloudOutline: "#BFBFBF",
  },
  giong: {
    eyeLeft: "#6FCF97",
    eyeRight: "#6FCF97",
    ribbon: "#5BC48A",
    cloudOutline: "#4CAF78",
  },
  ho_may: {
    eyeLeft: "#C4B8B0",
    eyeRight: "#C4B8B0",
    ribbon: "#D4C8C0",
    cloudOutline: "#A8988C",
  },
  cau_vong: {
    eyeLeft: "#FFE066",
    eyeRight: "#FFE066",
    ribbon: "#FFD93B",
    cloudOutline: "#E8C040",
  },
  gio: {
    eyeLeft: "#6FCF97",
    eyeRight: "#6FCF97",
    ribbon: "#5BC48A",
    cloudOutline: "#4CAF78",
  },
};

export function getMascotPartColors(cloudType: CloudType): MascotPartColors {
  return SPECIES_COLORS[cloudType] ?? SPECIES_COLORS.may_nhe;
}
