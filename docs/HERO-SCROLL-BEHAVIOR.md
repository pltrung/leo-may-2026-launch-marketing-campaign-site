# Hero scroll: cinematic 3-layer system

## Overview

- **Single driver:** One `heroProgress` (0 → 1) from scroll. No time-based intro, no mount/unmount at thresholds. Opacity and transform only.
- **3 layers:** (1) Fixed header. (2) Sticky hero stage (100dvh minus header/footer). (3) Fixed footer overlay at bottom of stage. Header, stage, and footer share the same background (HERO_BG).
- **Hero wrapper:** Height = `wrapperVh` (e.g. 300vh or 280vh). Sticky stage stays active until `heroProgress === 1`; then next section can unlock.
- **Vertical progress bar:** On the right; height animates with `heroProgress` (same value as hero).

## Structure

### 1) Header (fixed, always visible)
- Logo, language toggle, login. No animation. Rendered by page; not inside hero component.

### 2) Hero wrapper
- Tall wrapper (e.g. 300vh). Inside it: one sticky hero stage (`height: calc(100dvh - header - footer)`).
- All hero visuals and text live inside this sticky stage. One continuous background (HERO_BG + gradient).

### 3) Footer (fixed overlay inside hero stage)
- “Climb the Clouds. Build a Culture.” + copyright. Does not scroll in/out. Same background (HERO_BG).

### 4) Vertical progress bar
- Right side. Height = `heroProgress * 100%` of track. Driven by same scroll progress as the hero.

## Scroll logic

- `heroProgress = scrollY / maxScroll`, clamped 0..1, where `maxScroll = (100vh * wrapperVh) / 100`.
- All transitions use `smoothstep` and `heroProgress` only.

## Sequence

| heroProgress | Headline | Visual | Notes |
|--------------|----------|--------|--------|
| 0 – 0.15 | 1 (CLIMB WITH INTENTION.) | Mascot | CTA visible, progress bar 0 |
| 0.15 – 0.25 | Fade out 1 | Mascot exits (lift) | |
| 0.2 – 0.35 | Fade in 2 | Wall + holds in | |
| 0.35 – 0.55 | 2 (ASCEND TOGETHER.) | Holds, GLB fades in | |
| 0.45 – 0.55 | Fade out 2, hold | | |
| 0.5 – 0.65 | Fade in 3 | GLB | |
| 0.65 – 0.85 | 3 (SHAPE THE STANDARD.), then 4 (LEO MÂY — 2026.) | GLB | |
| 0.85 – 1 | Narrative faded out | Camera push, GLB dominant | CTA stays. FOV down. No black screen, no layout jump. |

Final 15%: Headline out, CTA visible, camera toward GLB (zoom in), FOV reduced, GLB centered and dominant. Background remains continuous.

## Mobile

- Stage uses `100dvh`. Safe-area insets respected (paddingBottom, etc.).
- GLB scale constrained so it does not overflow viewport.
- Layout: stacked (mascot above, headline + CTA below, centered).

## Result

Cohesive cinematic scroll: text and visuals change smoothly, CTA always visible, vertical progress bar reflects progress, final moment is strong GLB zoom focus. Single background throughout; no black screen.
