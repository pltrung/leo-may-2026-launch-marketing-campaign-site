# Hero scroll: simple locked frame

## Goal

Black hero. White logo. Locked frame. One scroll driver. No parallax, no background swaps, no layered scroll tricks. IP flies up → holds appear → GLB appears → final GLB zoom. CTA always visible. No black bleed. No section jump.

## Global style

- Hero background: pure black (#000).
- Header: white Leo Mây logo. Transparent over black hero.
- No gradient shifts. No background color changes during hero.

## Assets

- ip-flying (mascot)
- glb-rotating-bouldering-island.glb (GLB)
- Climbing holds background (/brand/holds.svg)

## Layout

- **Header** — Fixed top. White logo. Language + login. Does not animate.
- **Hero wrapper** — Height 350vh. No background.
- **Hero stage** — `position: sticky; top: 0; height: 100dvh; overflow: hidden; background: black`. Owns entire background.
- **Inside stage**: VisualContainer (centered), TextContainer, CTA (fixed in stage), vertical progress bar (right), FooterOverlay (bottom, same black).

## Scroll logic

Single value only:

`heroProgress = clamp(scrollY / (wrapperHeight - viewportHeight), 0, 1)`

No time-based animation. No mount/unmount. No threshold snapping.

## Steps

| heroProgress | Step | Visual | Text |
|--------------|------|--------|------|
| 0.00 – 0.33 | 1 | ip-flying visible, slight upward movement; holds hidden; GLB hidden | CLIMB WITH INTENTION. |
| 0.33 – 0.66 | 2 | ip-flying exits up + fade out; holds fade in; GLB starts fading in near end | ASCEND TOGETHER. |
| 0.66 – 0.90 | 3 | GLB fully visible; holds fade back; camera slightly closer | SHAPE THE STANDARD. |
| 0.90 – 1.00 | Final | Headline out; camera push into GLB; FOV down; GLB dominant | CTA only |

## Rules

- Hero stage never moves. No wrapper translate. Only internal content animates (opacity, translateY, camera).
- No background color change. No new section during hero. Sticky until heroProgress === 1.
- No black screen. No layout jump.

## Mobile

- 100dvh. Safe-area insets.
- Flex column so visual and text never overlap. No absolute for text/visual.
- ip-flying and GLB max-height constrained (e.g. 60vh).
- White logo on black.
