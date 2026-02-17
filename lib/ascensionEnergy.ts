import type { CloudType } from "./cloudData";

/**
 * Team-specific ascension energy for Dragon Ball Z–style evolution (stages 0–6).
 * Used to drive CSS variables and behavior classes. Do not resize or modify mascot SVG.
 */
export interface AscensionEnergyProfile {
  /** Primary energy color */
  primary: string;
  /** Secondary / fill color */
  secondary: string;
  /** Accent / glow color */
  accent: string;
  /** Optional gradient for rainbow-style (e.g. Cầu Vồng) */
  gradient?: string;
}

const PROFILES: Record<CloudType, AscensionEnergyProfile> = {
  may_nhe: {
    primary: "#7FD6FF",
    secondary: "#D6F3FF",
    accent: "rgba(214,243,255,0.6)",
  },
  suong_mu: {
    primary: "#B8C6D9",
    secondary: "#EEF3FA",
    accent: "#DCE3EF",
  },
  giong: {
    primary: "#FF635C",
    secondary: "#B84A45",
    accent: "rgba(255,229,228,0.7)",
  },
  ho_may: {
    primary: "#9A8B82",
    secondary: "#D4C8C0",
    accent: "rgba(212,200,192,0.6)",
  },
  cau_vong: {
    primary: "#FFE066",
    secondary: "#FFF0B8",
    accent: "rgba(255,224,102,0.7)",
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFE066 25%, #7FD6FF 50%, #9B59B6 75%, #FF6B6B 100%)",
  },
  gio: {
    primary: "#6FCF97",
    secondary: "#B8E8CE",
    accent: "rgba(184,232,206,0.6)",
  },
};

export function getAscensionEnergy(cloudType: CloudType): AscensionEnergyProfile {
  return PROFILES[cloudType] ?? PROFILES.may_nhe;
}

/** CSS custom properties for the mascot wrapper (--ascension-primary, etc.) */
export function getAscensionEnergyVars(cloudType: CloudType): Record<string, string> {
  const p = getAscensionEnergy(cloudType);
  const vars: Record<string, string> = {
    "--ascension-primary": p.primary,
    "--ascension-secondary": p.secondary,
    "--ascension-accent": p.accent,
  };
  if (p.gradient) vars["--ascension-gradient"] = p.gradient;
  return vars;
}
