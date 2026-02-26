# Cinematic Hero Scroll — Playbook

**Purpose:** Check what’s in place and align with user behavior intention. Use this for QA and product alignment.

---

## 1. User behavior intention

### What we want the user to feel

- **Scrolling does not move the page.** The screen feels **locked**; only the story inside the frame changes.
- **Header, footer, and CTA are fixed.** They don’t scroll or animate. The user always knows where they are.
- **Only the middle content animates:** headline text and visuals (mascot → holds → GLB) change with scroll.
- **No black screen, no background shift, no layout jump.** One continuous, stable frame from 0% to 100%.
- **Final state:** Headline fades out, CTA stays, camera pushes into the GLB so it fills the frame. Feels like a clear “end of chapter” before the next section can scroll in.

### Intended flow

1. User lands → sees mascot + “CLIMB WITH INTENTION.” + CTA.
2. User scrolls → mascot floats slightly, then exits up; headline and visual change in sync.
3. User keeps scrolling → wall/holds appear, then GLB fades in and grows.
4. User reaches end of hero scroll → headline gone, GLB zoomed in, CTA still there.
5. User scrolls past hero → next section (e.g. cloud selection) can appear; no sudden black or jump.

---

## 2. What’s in place (implementation checklist)

### Page-level (app/[locale]/page.tsx)

| Item | Status | Notes |
|------|--------|------|
| `USE_CINEMATIC_HERO` | ✅ | `true` — cinematic hero is on when not in cloud view |
| `HERO_WRAPPER_VH` | ✅ | `400` — wrapper height 400vh |
| `HERO_HEADER_PX` / `HERO_FOOTER_PX` | ✅ | 64 / 56 — passed into hero |
| `showCinematicLayers` | ✅ | `USE_CINEMATIC_HERO && !showClouds` |
| Scroll lock | ✅ | When cinematic, scroll clamped so user can’t scroll past hero until progress = 1 |
| Page container height | ✅ | When cinematic: `400vh`, `background: HERO_BG` |
| Fixed header (cinematic) | ✅ | Logo (white) + Language + Know Your Team; fixed top, no animate |
| Legacy header | ✅ | When not cinematic: top-right Language + Know Your Team |
| Hero content | ✅ | When cinematic: `<CinematicHeroScroll />` with locale, footerMessages, etc. |
| CloudFooter section | ✅ | Hidden during cinematic (`(!USE_CINEMATIC_HERO \|\| showClouds)`) |

### Component: CinematicHeroScroll

| Item | Status | Notes |
|------|--------|------|
| **Hero wrapper** | ✅ | Height `wrapperVh` (400vh), no background on wrapper |
| **Hero stage** | ✅ | `sticky; top: 0; height: 100dvh; overflow: hidden; background: HERO_BG` |
| **Scroll driver** | ✅ | Single value: `heroProgress = clamp(scrollY / (wrapperHeight - viewportHeight), 0, 1)` |
| **RAF throttle** | ✅ | Scroll/resize → requestAnimationFrame → set state once per frame |
| **No time-based animation** | ✅ | All motion driven by heroProgress only |
| **No mount/unmount at thresholds** | ✅ | GLB mounts once when progress ≥ 0.5, then stays mounted |

### Assets in use

| Asset | Path / component | When visible |
|-------|------------------|-------------|
| Mascot (ip-flying) | `/brand/ip-flying.svg` | STEP 1–2 (0–0.5); then fades and moves up |
| Wall + holds | `/brand/holds.svg` | STEP 2–3 (0.25–0.75) |
| GLB sculpture | `HeroIslandCanvas` → `glb-rotating-bouldering-island.glb` | STEP 3–FINAL (0.5–1) |

### Sequence (heroProgress bands)

| heroProgress | Step | Visual | Headline |
|--------------|------|--------|----------|
| **0 – 0.25** | 1 | Mascot centered, slight vertical float (sin) | “CLIMB WITH INTENTION.” |
| **0.25 – 0.50** | 2 | Mascot moves up + fades out; wall/holds fade in | “ASCEND TOGETHER.” |
| **0.50 – 0.75** | 3 | Holds fade out; GLB fades in | “SHAPE THE STANDARD.” |
| **0.75 – 0.90** | 4 | GLB scales up slightly | “LEO MÂY — 2026.” |
| **0.90 – 1.00** | Final | Headline container fades out; camera push + FOV down; GLB dominant | (none; CTA only) |

### Layout inside stage

| Element | Placement | Behavior |
|---------|-----------|----------|
| **Headline** | Single `<h1>`, 4 lines toggled by opacity (one visible per step) | Opacity 0 in FINAL |
| **Visual (mascot)** | Flex-1 area; desktop: centered in middle; mobile: in column below headline | Max-height constrained on mobile (50vh) |
| **CTA** | Below headline; desktop: absolute bottom center; mobile: flex-shrink at bottom | Always visible; `pointer-events-auto` |
| **Vertical progress bar** | Absolute right; height = heroProgress % | Same driver as content |
| **Footer overlay** | Absolute bottom; same HERO_BG | Tagline + copyright; never scrolls |

### Rules (enforced in code)

- **No wrapper/stage animation** — wrapper and sticky stage are not translated or animated.
- **Only internal content animates** — opacity, translateY (mascot), camera (GLB), scale (GLB).
- **Background constant** — HERO_BG everywhere; no gradient or color change during hero.
- **One headline element** — one `<h1>` with four `<span>`s; only one span has opacity 1 per step.
- **Flex column** — content uses flex column so headline, visual, and CTA don’t overlap (especially on mobile).
- **Sticky until heroProgress === 1** — scroll lock on page keeps user inside hero until end.

### Mobile

| Item | Status |
|------|--------|
| 100dvh | ✅ Stage height |
| Safe-area insets | ✅ `paddingTop/Bottom: env(safe-area-inset-*)` on content |
| Mascot max height | ✅ e.g. 50vh; max-w 260px |
| GLB max height | ✅ 55vh; scale cap 2.8 |
| Flex column | ✅ Headline → flex-1 (mascot) → CTA; no absolute for text/visual in flow |
| Text size | ✅ clamp(28px, 8vw, 44px) for headline |

### Constants (lib/heroConstants.ts)

- **HERO_BG** — `#0B0B0F` (single source for hero/chrome background).

---

## 3. Quick verification checklist

Use this to confirm behavior matches intention:

- [ ] On load: mascot + “CLIMB WITH INTENTION.” + CTA; header fixed; no scroll yet.
- [ ] Scroll down: mascot floats slightly, then moves up and fades; headline switches to “ASCEND TOGETHER.” when holds appear.
- [ ] Further scroll: holds fade out, GLB fades in; headline “SHAPE THE STANDARD.” then “LEO MÂY — 2026.”.
- [ ] Near end: headline fades out; CTA remains; GLB zooms in (camera + FOV); progress bar full.
- [ ] Scroll locked until hero “ends” (no next section visible during hero).
- [ ] No black flash; no background color change; no layout jump.
- [ ] Mobile: headline, mascot, CTA in column; mascot/GLB don’t overlap text; safe areas respected.

---

## 4. Files to check

| File | Role |
|------|------|
| `components/CinematicHeroScroll.tsx` | Hero component: scroll driver, sequence, layout, assets |
| `app/[locale]/page.tsx` | Toggle cinematic vs legacy, scroll lock, fixed header, footer visibility |
| `lib/heroConstants.ts` | HERO_BG |
| `components/HeroIslandCanvas.tsx` | GLB canvas, camera, FOV |
| `components/HeroIslandGLB.tsx` | GLB model load, rotation, opacity |

---

## 5. Doc vs implementation note

- **HERO-SCROLL-BEHAVIOR.md** describes an older 350vh / 3-step variant.
- **This playbook** reflects the **current** 400vh / 4-step + final implementation and user intention. Prefer this playbook for “what’s in place” and behavior checks.
