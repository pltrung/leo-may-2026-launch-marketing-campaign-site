/**
 * Hotspot definitions for the 3D hero.
 * Tweak position, size, focusCam, and lookAt after previewing the scene in the browser.
 * - position: [x, y, z] center of the invisible hitbox in scene space
 * - size: [x, y, z] half-extents or full size for BoxGeometry (we use as full width/height/depth)
 * - focusCam: camera position when this hotspot is focused
 * - lookAt: point the camera looks at when focused
 */

export interface HotspotDef {
  id: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  focusCam: [number, number, number];
  lookAt: [number, number, number];
  description: string;
  /** 2–3 bullet highlights for mobile bottom sheet */
  highlights?: string[];
}

export const HOTSPOTS: HotspotDef[] = [
  {
    id: "main",
    label: "Main Arena",
    position: [0, 1.5, 0],
    size: [3, 2, 2],
    focusCam: [0, 2, 6],
    lookAt: [0, 1, 0],
    description: "The heart of the gym. Climb, connect, and ascend.",
    highlights: ["Premium climbing terrain", "Community events", "Open to all levels"],
  },
  {
    id: "training",
    label: "Training",
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
    position: [3, 0.8, 1],
    size: [2, 1.5, 2],
    focusCam: [4, 1.5, 5],
    lookAt: [3, 0.8, 0],
    description: "Rest, recharge, and connect.",
    highlights: ["Comfortable seating", "Café area", "Social space"],
  },
  {
    id: "monument",
    label: "Monument",
    position: [0, 2.5, -0.5],
    size: [1.5, 2, 1],
    focusCam: [0, 2.5, 4],
    lookAt: [0, 2.5, 0],
    description: "Founding Circle. Your name becomes part of Leo Mây.",
    highlights: ["Founding member recognition", "Exclusive benefits", "Name on the wall"],
  },
  {
    id: "construction",
    label: "Construction",
    position: [-2, 0.5, -2],
    size: [2, 1.5, 2],
    focusCam: [-2, 1, 3],
    lookAt: [-2, 0.5, -1],
    description: "What we're building, together.",
    highlights: ["Opening 2026", "Ho Chi Minh City", "Built with the community"],
  },
];
