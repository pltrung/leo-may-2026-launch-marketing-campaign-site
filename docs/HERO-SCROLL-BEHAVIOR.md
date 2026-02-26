# Hero scroll: locked cinematic frame

## Goal

Scrolling should feel **invisible**. Content inside a **fixed frame** is animating. Header, footer, and CTA **do not move** — they stay in the same screen position. Only the left narrative text and the center visual change as scroll progresses.

## Overview

- **Locked frame.** Hero stage is sticky, height 100dvh. Header (fixed), footer (overlay at bottom of stage), and CTA (fixed position within stage) do not move during hero scroll.
- **Only narrative + visual change.** Left: headline and meta (opacity + translate). Center: mascot → wall/holds → GLB. Both transition in sync per step.
- **Single heroProgress (0..1).** One scroll-driven value. Divide into steps; each step: headline and visual change together.
- **Wrapper 350vh.** Background continuous. No new background, no black screen. Next section unlocks only after heroProgress === 1.

## Structure

### Hero wrapper
- Height **350vh**. Scroll range only; stage stays fixed.

### Hero stage (sticky, 100dvh)
- Covers viewport. Background (HERO_BG + gradient) does not change.
- **Header:** Fixed by page; does not move.
- **Footer:** Overlay inside stage, `position: absolute; bottom: 0`. Does not move.
- **CTA:** Fixed position within stage (e.g. left, above footer). Does not move.
- **Left narrative:** Fixed region (top-left); only headline + meta content changes (opacity/translate).
- **Center visual:** Mascot, then wall/holds, then GLB; changes with heroProgress.
- **Progress bar:** Right side; height = heroProgress.

## Behavior

- **heroProgress** divided into steps. Each step: headline and visual transition at the same time (opacity + translate).
- Steps 1–4: Headlines 1 → 2 → 3 → 4; visuals: mascot → holds → GLB.
- **Final step (0.9 – 1):** Headline fades out. CTA remains. GLB zooms in and becomes dominant. No new background. Stage remains locked until heroProgress === 1.

## Mobile and desktop

Both use the same locked cinematic frame: same heroProgress steps, same headline/visual transitions, same final GLB zoom. On mobile: narrative at top center, center visual (mascot/GLB) fixed in middle, CTA fixed above footer; slightly stronger vignette and progress bar for clarity; 100dvh and safe-area respected. Same cinematic feeling on all viewports.

## No scroll feel / no black screen

- Hero container has no translateY or parallax; scroll does not move the hero visually.
- Cinematic hero is rendered inside a **plain div** (no Framer Motion transform wrapper) so `position: sticky` is relative to the viewport — the stage stays fixed until heroProgress === 1.
- Page and hero wrapper use HERO_BG for the full scroll range so no other background appears.
- Only internal elements animate: IP translateY (upward), headline opacity (crossfade), visual opacity, GLB camera zoom. No container movement.

## Result

Locked cinematic frame: header, footer, and CTA stay fixed; only narrative and center visual animate. Scrolling feels invisible. Mobile and desktop both feel cinematic.
