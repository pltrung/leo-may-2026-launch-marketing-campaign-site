# Hero scroll: locked cinematic frame (rebuild)

## Core idea

The hero feels like a **locked cinematic frame**. The page does not appear to scroll. Scroll only drives animation progress inside a fixed stage. Header, footer, and CTA never move. Only the headline and the visual change.pus

## Structure

1. **Header (fixed)** — Logo, language toggle, login. Always visible. No animation. Rendered by page.

2. **Hero wrapper** — Height 350vh. Inside it: one sticky **hero stage**.
   - `position: sticky; top: headerHeight; height: calc(100dvh - headerHeight); overflow: hidden` so the stage height accounts for the header.
   - Single continuous background. No gradient shifts or background changes during hero.

3. **Footer overlay** — Inside hero stage, bottom anchored. "Climb the Clouds. Build a Culture." + copyright. Does not scroll in/out. Same background as hero.

4. **CTA** — Always visible. Fixed position. Never moves.

5. **Vertical progress bar** — Right side. Height = heroProgress. Same driver as everything else.

## Scroll driver

One value only; **no global scrollY**. Progress is computed from the hero wrapper’s position:

- Measure the wrapper (outer 350vh div) with `getBoundingClientRect()`.
- `heroProgress = 0` when wrapper top hits viewport top.
- `heroProgress = 1` when wrapper bottom hits viewport bottom.
- Formula: `progress = clamp(-rect.top / (rect.height - viewportHeight), 0, 1)`. Progress is not updated after the wrapper finishes scrolling (stays at 1).
- No time-based animations. No multiple drivers. Everything interpolates from heroProgress.

## Sequence (4 segments + final)

| heroProgress | Step | Visual | Headline |
|--------------|------|--------|----------|
| 0.00 – 0.25 | 1 | Mascot (IP) | CLIMB WITH INTENTION. |
| 0.25 – 0.50 | 2 | Mascot exits up; wall + holds fade in | ASCEND TOGETHER. |
| 0.50 – 0.75 | 3 | Holds fade out; GLB fades in | SHAPE THE STANDARD. |
| 0.75 – 0.90 | 4 | GLB slightly larger | LEO MÂY — 2026. |
| 0.90 – 1.00 | Final | Headline out; CTA stays; camera dolly in; FOV down; GLB dominant | (faded out) |

Text and visual change at the same time at each step. One headline component (four options, opacity per step). **Only one headline has opacity > 0 at a time;** no overlapping headline fade bands. Next section appears when hero wrapper finishes scrolling; no conditional unlock logic.

## Strict rules

- No container translateY. No parallax on hero wrapper. No background switching.
- No new section visible during hero. No duplicate headline components. No layout shift. No black screen at end.
- Mobile: 100dvh, safe-area insets, GLB scale constrained.

## Goal

Scrolling feels invisible. Letters and visuals animate inside a fixed cinematic frame.
