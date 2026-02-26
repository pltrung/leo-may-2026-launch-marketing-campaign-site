# Hero scroll: desktop & mobile behavior

## Overview

- **The hero is the entire page.** There is no section below the hero wrapper. Page height = hero wrapper height (280vh) only.
- **One wrapper:** `280vh` tall. User scrolls through 2.8 viewport heights; that is the full page.
- **One sticky stage:** `position: sticky; top: 64px; height: calc(100vh - 64px - 56px)` (three layers: header strip, middle stage band, footer bar). The stage stays fixed in the viewport for the entire scroll. There is no “sticky unlock” that reveals new content.
- **One driver:** `heroProgress = scrollY / (280 * vh/100)` from `0` to `1`. All animations use this only.
- **Background:** Wrapper and sticky stage use HERO_BG. Stage has gradient + **wall + holds** as the main background; GLB and narrative sit on top. Header is fixed over the stage.
- **Terminal state:** When `heroProgress === 1`, the viewport is locked in the final cinematic state. Scroll is clamped at 280vh so no new content can appear from below. No panel ever appears from below.

---

## When the user scrolls (shared)

1. **0–280vh:** The sticky stage stays fixed. Content inside the stage animates as `heroProgress` goes 0 → 1.
2. **At 280vh (heroProgress = 1):** Final state: GLB large and dominant, narrative text gone, CTA visible, footer overlay visible, header visible. Background consistent. Scroll is locked at 280vh so further scrolling does not reveal any new content. The viewport stays in this terminal landing state.

---

## Desktop (≈ >768px)

### Layout

- **Header:** Fixed at top (64px), full width. Logo left, VN | EN + Login right. No background.
- **Stage:** Middle band only: `top: 64px`, `height: calc(100vh - 64px - 56px)`. Content:
  - **Left narrative panel:** ~48% width, left-aligned. **One text layer:** five headlines that change with scroll (crossfade: outgoing slides up + fades, incoming slides up from below). Meta line, CTA. **One CTA layer.** **One image layer:** IP mascot (early), then wall + holds as background, then GLB.
  - **Background:** Wall + holds fade in with scroll (0.12–0.32), then fade to background as GLB emerges (0.52–0.72).
- **Footer:** One bar at bottom of the stage (56px). Tagline + copyright. Sibling of content inside the sticky stage (flex-shrink-0).

### Scroll → heroProgress (0 → 1)

| heroProgress | What the user sees |
|--------------|--------------------|
| **0 – 0.1** | Hero 1: IP only; headline “CLIMB WITH INTENTION.”; meta + CTA. No GLB, no wall/holds. |
| **0.1 – 0.32** | IP goes up and fades out. Wall + holds fade in (0.12–0.32). Headline still 1. |
| **0.2 – 0.33** | Headline crossfade → “ASCEND TOGETHER.” Wall/holds in; no GLB yet. |
| **0.33 – 0.46** | Headline crossfade → “BUILD YOUR CLOUD.” Holds stable. |
| **0.35 – 0.58** | GLB fades in. Holds start fading to background (0.52–0.72). |
| **0.46 – 0.6** | Headline crossfade → “SHAPE THE STANDARD.” |
| **0.6 – 0.8** | Headline → “LEO MÂY — 2026.” GLB zooms out slightly. |
| **0.8 – 0.92** | All headline + meta fade out; CTA remains. Particles intensify. |
| **0.88 – 0.96** | “LEO MÂY — 2026” centered text fades in then out. |
| **0.9 – 1.00** | **Terminal state:** Camera pushes into GLB (dolly + FOV). GLB dominant; only CTA visible. Footer at bottom. |

Narrative: **single text layer** with **crossfade** (outgoing slides up + fades, incoming slides up from below); at most 2 headlines visible during transition. Boundaries at 0.2, 0.33, 0.46, 0.6, 0.8.

---

## Mobile (≤768px)

### Layout

- **Header:** Same fixed top bar (64px).
- **Stage:** Same middle band (calc(100vh − 64px − 56px)). Content:
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
| Sticky stage | calc(100vh − header − footer), top: 64px | Same |
| At heroProgress = 1 | Terminal state; scroll locked | Terminal state; scroll locked |
| Narrative position | Left column ~48% | Full width, centered |
| Footer | Bottom of stage, fixed | Bottom of stage, fixed |

The viewport is locked in the final cinematic state at heroProgress = 1. No new panel ever appears from below.
