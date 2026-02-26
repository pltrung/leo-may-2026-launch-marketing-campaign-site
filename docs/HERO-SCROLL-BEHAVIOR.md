# Hero scroll: desktop & mobile behavior

## Overview

- **The hero is the entire page.** There is no section below the hero wrapper. Page height = hero wrapper height (280vh) only.
- **One wrapper:** `280vh` tall. User scrolls through 2.8 viewport heights; that is the full page.
- **One sticky stage:** `position: sticky; top: 0; height: 100vh`. The stage stays fixed in the viewport for the entire scroll. There is no “sticky unlock” that reveals new content.
- **One driver:** `heroProgress = scrollY / (280 * vh/100)` from `0` to `1`. All animations use this only.
- **Background:** Body (and BrandBackground when used) provides the background. No separate black layer underneath. Header, stage, and footer are transparent over it.
- **Terminal state:** When `heroProgress === 1`, the viewport is locked in the final cinematic state. Scroll is clamped at 280vh so no new content can appear from below. No panel ever appears from below.

---

## When the user scrolls (shared)

1. **0–280vh:** The sticky stage stays fixed. Content inside the stage animates as `heroProgress` goes 0 → 1.
2. **At 280vh (heroProgress = 1):** Final state: GLB large and dominant, narrative text gone, CTA visible, footer overlay visible, header visible. Background consistent. Scroll is locked at 280vh so further scrolling does not reveal any new content. The viewport stays in this terminal landing state.

---

## Desktop (≈ >768px)

### Layout

- **Header:** Fixed at top (64px), full width. Logo left, VN | EN + Login right. No background.
- **Stage:** Full 100vh. Content:
  - **Left narrative panel:** ~48% width, left-aligned. Headlines (hero 1→4), meta line, CTA. Fixed position in stage (does not scroll).
  - **Center/right:** IP mascot (early), then wall/holds, then GLB. GLB is centered in the view; narrative stays on the left.
- **Footer:** One bar at bottom of stage (56px). Tagline + copyright. Fixed at bottom of 100vh (does not scroll).

### Scroll → heroProgress (0 → 1)

| heroProgress | What the user sees |
|--------------|--------------------|
| **0 – 0.12** | IP mascot visible; headline 1 “CLIMB WITH INTENTION.”; meta + CTA. No GLB, no wall. Footer fades in (0.15–0.35). |
| **0.12 – 0.22** | IP lifts and fades out. Wall/holds fade in (~0.18–0.28). Headline 1 unchanged. |
| **0.22 – 0.30** | Headline 1 + meta fade out. Brief “empty” narrative. |
| **0.30 – 0.40** | GLB fades in. Holds visible. No headline yet. |
| **0.40 – 0.52** | Headline 2 “ASCEND TOGETHER.” fades in (after hold). GLB visible. CTA stays. |
| **0.52 – 0.65** | Headline 2 fades out. Holds fade back. |
| **0.60 – 0.72** | Headline 3 “SHAPE THE STANDARD.” fades in. |
| **0.72 – 0.85** | Headline 3 out, headline 4 “LEO MÂY — 2026.” in. Camera zooms out slightly. |
| **0.85 – 1.00** | **Terminal state:** Narrative (headlines + meta) fade out. CTA stays. Camera dollies in, FOV down, GLB scales up and dominates. Slight darken overlay. Particles reduce. Footer at bottom. No layout change; viewport locked in this state. |

Narrative transitions use: **fade out (40% of window) → hold (20%) → fade in (40%)**. No simultaneous swap; one stack, no ghosting.

---

## Mobile (≤768px)

### Layout

- **Header:** Same fixed top bar (64px).
- **Stage:** Same 100vh. Content:
  - **Narrative:** Full width, centered text. Headlines wrap (1–2 words per line via `mobileHeadlineLines`). CTA below.
  - **IP:** Centered, ~60% width, above the headline block initially.
  - **GLB / wall / holds:** Same as desktop but in one viewport; narrative and GLB share the same 100vh.
- **Footer:** Same 56px bar at bottom of stage.

### Scroll → heroProgress (0 → 1)

Same **heroProgress** timeline as desktop. Same terminal state at heroProgress = 1; scroll locked at 280vh.

---

## Summary

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Page content | Hero only (280vh) | Hero only (280vh) |
| Section below hero | None | None |
| Wrapper height | 280vh | 280vh |
| Sticky stage | 100vh, top: 0 | 100vh, top: 0 |
| At heroProgress = 1 | Terminal state; scroll locked | Terminal state; scroll locked |
| Narrative position | Left column ~48% | Full width, centered |
| Footer | Bottom of stage, fixed | Bottom of stage, fixed |

The viewport is locked in the final cinematic state at heroProgress = 1. No new panel ever appears from below.
