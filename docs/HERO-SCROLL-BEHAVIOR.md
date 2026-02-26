# Hero scroll: desktop & mobile behavior

## Overview

- **One wrapper:** `280vh` tall. User scrolls through 2.8 viewport heights.
- **One sticky stage:** `position: sticky; top: 0; height: 100vh`. The stage stays fixed in the viewport for the entire 280vh of scroll (locked viewport).
- **One driver:** `heroProgress = scrollY / (280 * vh/100)` from `0` to `1`. All animations use this only.
- **One background:** Page provides a fixed full-viewport layer (`HERO_BG`). Header, stage, and footer are transparent over it.

---

## When the user scrolls (shared)

1. **0–280vh:** Only the hero wrapper is “moving”; the sticky stage does not move. The user sees one continuous 100vh frame. Content inside the stage animates as `heroProgress` goes 0 → 1.
2. **After 280vh:** Sticky unlocks; the next section (e.g. CloudFooter) scrolls in. The same fixed background stays, so no black flash.

---

## Desktop (≈ >768px)

### Layout

- **Header:** Fixed at top (64px), full width. Logo left, VN | EN + Login right. No background.
- **Stage:** Full 100vh below header. Content:
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
| **0.85 – 1.00** | **Final focus:** Narrative (headlines + meta) fade out. CTA stays. Camera dollies in, FOV down, GLB scales up and dominates. Slight darken overlay. Particles reduce. Footer stays at bottom. |

Narrative transitions use: **fade out (40% of window) → hold (20%) → fade in (40%)**. No simultaneous swap; one stack, no ghosting.

---

## Mobile (≤768px)

### Layout

- **Header:** Same fixed top bar (64px).
- **Stage:** Same 100vh. Content:
  - **Narrative:** Full width, centered text. Headlines wrap (1–2 words per line via `mobileHeadlineLines`). CTA below. Still a fixed “left” panel in terms of scroll (it doesn’t move with scroll).
  - **IP:** Centered, ~60% width, above the headline block initially.
  - **GLB / wall / holds:** Same as desktop but in one viewport; narrative and GLB share the same 100vh.
- **Footer:** Same 56px bar at bottom of stage.

### Scroll → heroProgress (0 → 1)

Same **heroProgress** timeline as desktop. Only layout differs:

- Headlines are larger (clamp) and centered with shorter lines.
- IP is centered and lifts/fades the same way.
- GLB scale at end is slightly smaller (3.2 vs 4) for viewport fit.
- Same fade-out → hold → fade-in for narrative; same final 10–15% with GLB focus and footer fixed at bottom.

---

## Summary

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Wrapper height | 280vh | 280vh |
| Sticky stage | 100vh, top: 0 | 100vh, top: 0 |
| Narrative position | Left column ~48% | Full width, centered |
| Headlines | Single line or wrapped in container | 1–2 words per line |
| IP | Right-of-center, then exits | Centered, then exits |
| GLB | Center stage, then dominates | Same, slightly smaller end scale |
| Footer | Bottom of stage, fixed | Bottom of stage, fixed |
| Next section | After scroll > 280vh | After scroll > 280vh |

Both use one background, one timeline (`heroProgress`), and one sticky stage so the viewport feels locked until the hero is finished; then the next section scrolls in with no black screen.
