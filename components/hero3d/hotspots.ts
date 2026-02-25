/**
 * Hotspot definitions for the 3D hero (Imaginary Ones–style CTA zones).
 * Tweak position, size, focusCam, lookAt after previewing the scene.
 * - ctaLabel: button text for the zone CTA
 * - href: anchor or route for CTA (e.g. /#arena → scroll to id="arena")
 * - shortDescription: one sentence for panel/sheet
 * - accent: optional hex for subtle UI tint
 */

export interface HotspotDef {
  id: string;
  label: string;
  /** CTA button label e.g. "Explore The Arena" */
  ctaLabel: string;
  /** Anchor or route e.g. "/#arena" */
  href: string;
  /** One sentence for panel */
  shortDescription: string;
  /** Optional tint for pill/halo (e.g. "#4FA3FF") */
  accent?: string;
  position: [number, number, number];
  size: [number, number, number];
  focusCam: [number, number, number];
  lookAt: [number, number, number];
  description: string;
  highlights?: string[];
}

export const HOTSPOTS: HotspotDef[] = [
  {
    id: "main",
    label: "Main Arena",
    ctaLabel: "Explore The Arena",
    href: "/#arena",
    shortDescription: "The heart of the gym. Climb, connect, and ascend.",
    position: [0, 1.5, 0],
    size: [3, 2, 2],
    focusCam: [0, 2, 6],
    lookAt: [0, 1, 0],
    description: "The heart of the gym. Climb, connect, and ascend.",
    highlights: ["Premium climbing terrain", "Community events", "Open to all levels"],
  },
  {
    id: "training",
    label: "Training Zone",
    ctaLabel: "Train With Us",
    href: "/#training",
    shortDescription: "Boards, hang training, and focused practice stations.",
    position: [-4, 1, 1],
    size: [2, 2, 2],
    focusCam: [-3, 2, 5],
    lookAt: [-4, 1, 0],
    description: "Where technique meets intention.",
    highlights: ["Coaching sessions", "Skill workshops", "Structured programs"],
  },
  {
    id: "lounge",
    label: "Lounge",
    ctaLabel: "Join The Community",
    href: "/#community",
    shortDescription: "Rest, recharge, and connect.",
    position: [3, 0.8, 1],
    size: [2, 1.5, 2],
    focusCam: [4, 1.5, 5],
    lookAt: [3, 0.8, 0],
    description: "Rest, recharge, and connect.",
    highlights: ["Comfortable seating", "Café area", "Social space"],
  },
  {
    id: "monument",
    label: "Founding Circle",
    ctaLabel: "Ascend (Founding Circle)",
    href: "/#founding",
    shortDescription: "Your name becomes part of Leo Mây.",
    accent: "#4FA3FF",
    position: [0, 2.5, -0.5],
    size: [1.5, 2, 1],
    focusCam: [0, 2.5, 4],
    lookAt: [0, 2.5, 0],
    description: "Founding Circle. Your name becomes part of Leo Mây.",
    highlights: ["Founding member recognition", "Exclusive benefits", "Name on the wall"],
  },
  {
    id: "construction",
    label: "Opening 2026",
    ctaLabel: "See Opening Plan",
    href: "/#opening",
    shortDescription: "What we're building, together.",
    position: [-2, 0.5, -2],
    size: [2, 1.5, 2],
    focusCam: [-2, 1, 3],
    lookAt: [-2, 0.5, -1],
    description: "What we're building, together.",
    highlights: ["Opening 2026", "Ho Chi Minh City", "Built with the community"],
  },
];
