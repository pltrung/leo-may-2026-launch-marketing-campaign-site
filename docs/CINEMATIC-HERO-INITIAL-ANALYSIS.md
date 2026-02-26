# Cinematic Hero — Analysis: Initial vs Later Patches

This doc compares the **initial** scroll-driven cinematic hero (what was “doing the right thing”) with the later patch fixes, so we can see what the original design got right and what changed.

---

## 1. Which “initial” version?

From git history, the first **scroll-only, locked-frame** cinematic hero (no time-based intro) appears at:

- **e1d798f** — *“Hero rebuild: single timeline, sticky 100vh stage, narrative panel, GLB focus; add scroll behavior doc”*
- **a78ca20** — *“Hero: locked cinematic frame, 350vh, fixed CTA/footer, narrative+visual only change”*

Those are the versions that match “scrolling should NOT feel like the page is moving” and “only the middle content animates.”

---

## 2. What the initial implementation did right

### Single scroll driver

- **One value:** `heroProgress = scrollY / range` (or `scrollY / maxScroll`).
- **No time-based animation:** No `useIntroProgress`, no frame timers. Scroll is the only input.
- **RAF throttle:** One `requestAnimationFrame` per scroll tick to avoid layout thrash.

So: one global driver, no competing timelines.

### Locked viewport

- **Sticky stage:** `position: sticky; top: 0; height: 100vh` (or 100dvh).
- **Wrapper:** Tall div (e.g. 280vh or 350vh). Only the wrapper “scrolls”; the stage stays fixed until the end of that range.
- **No wrapper/container animation:** No translate on the wrapper or sticky container. Only **internal** content (opacity, translateY, camera, scale) animates.

So: the “screen” doesn’t move; only the story inside the frame changes.

### One narrative stack, disciplined transitions

**e1d798f** in particular:

- **Single headline stack:** One panel, 4–5 lines (hero 1→4 + optional meta). No duplicate stacks.
- **Clear boundaries:** `BOUNDARIES = [0.2, 0.35, 0.5, 0.65, 0.82]` with a fixed **window** `W` and phases:
  - **Fade out** (first 40% of window)
  - **Hold** (middle 20%) — both headlines at 0 opacity
  - **Fade in** (last 40%)
- **No simultaneous swap:** At any time only one line is “active” or two are in transition (out going to 0, in coming from 0). No overlapping full-opacity bands, no ghosting.

So: text and visual change **together**, with predictable, non-overlapping transitions.

### Clear step mapping

The **HERO-SCROLL-BEHAVIOR.md** at e1d798f spelled out:

- **0–0.12:** IP visible, headline 1, meta + CTA.
- **0.12–0.22:** IP lift + fade; wall/holds in.
- **0.22–0.30:** Headline 1 + meta out; brief hold.
- **0.30–0.40:** GLB in; holds visible.
- **0.40–0.52:** Headline 2 in (after hold).
- …through to **0.85–1.00:** Narrative out, CTA stays, camera dolly + FOV + GLB dominant.

So: one shared timeline for desktop and mobile; only layout differs.

### Fixed chrome

- **Header:** Fixed at top; no animation.
- **Footer:** Absolute bottom of stage; same background; does not scroll in/out.
- **CTA:** Stays visible; final phase only fades narrative, not CTA.

So: header, footer, and CTA stay fixed; only the middle (narrative + visual) animates.

### Background

- **Single background:** HERO_BG on stage (and optionally page). Radial gradient + inset shadow on the **stage** for depth, not on the wrapper.
- **No background swap:** Same background for the whole hero.

So: one global background source; no layered or wrapper-level change.

### GLB and final payoff

- **GLB:** Fades in mid-timeline; at the end (e.g. 0.85–1) camera dollies in, FOV down, scale up; GLB dominates.
- **Mount once:** Canvas mounts when progress crosses a threshold (e.g. ≥ 0.15) and stays mounted to avoid pop.

So: clear “end of chapter” and no black screen.

---

## 3. What changed in later patches (and why it might have felt wrong)

| Change | What was done | Risk / downside |
|--------|----------------|------------------|
| **heroProgress formula** | Switched to `getBoundingClientRect()`: progress from wrapper top/bottom vs viewport. Then later back to `scrollY / (wrapperHeight - viewportHeight)`. | Initial used `scrollY / wrapperHeight` (e.g. 280vh). New formula ties progress = 1 to “sticky end.” Correct for “lock until done,” but if not applied consistently (e.g. maxScroll wrong on page), progress can feel off or sticky can unlock too early/late. |
| **Headline logic** | Replaced “fade out → hold → fade in” with **step bands:** only one headline opacity = 1 per band (e.g. 0–0.25 h1, 0.25–0.5 h2). Hard cuts or very narrow bands. | Removes overlapping fade bands (good) but can feel abrupt. Initial had smooth crossfade with an explicit hold so text and visual stayed in sync without overlap. |
| **Stage height / header** | Stage sometimes set to `top: headerHeight`, `height: calc(100dvh - headerHeight)`. | Depends on product: if header is over the stage, stage can stay full viewport; if header is above stage, this is correct. Initial doc assumed “stage full 100vh below header” or header overlay. |
| **Wrapper background** | Removed background from wrapper; later single global background (html/body). | Good for “one source”; initial had background on wrapper or page — removing it fixes layered-background bugs. |
| **Delete/rebuild** | Full delete and rebuilds (e.g. 3 steps vs 4 steps, pure black, 400vh). | Step counts and band boundaries changed; narrative pacing can feel different from the initial 4-headline, boundary-based design. |

So: the **initial** version was right in **concept** (single driver, locked frame, one stack, disciplined transitions, fixed chrome, one background). The **patches** fixed real bugs (progress vs sticky end, background layers) but sometimes changed **behavior** (headline transitions, step boundaries) in ways that drifted from the original “doing the right thing” feel.

---

## 4. Recommendation: what to preserve from the initial design

When adjusting the current hero (or re-spec’ing it), keep these from the **initial** implementation:

1. **Single scroll driver** — `heroProgress` from scroll only; no time-based animation.
2. **Correct progress range** — `heroProgress = clamp(scrollY / (wrapperHeight - viewportHeight), 0, 1)` so progress = 1 when the sticky **ends** (no animation after unlock).
3. **One headline stack** — one DOM stack, 4 lines; **fade out → hold → fade in** per transition (like e1d798f) so text and visual change together without overlapping full-opacity bands.
4. **Fixed chrome** — header, footer, CTA fixed; only middle content animates.
5. **Sticky stage** — no wrapper/stage translate; only internal opacity, translateY, camera, scale.
6. **One background source** — html/body or stage only; no wrapper-level or layered background.
7. **Documented boundaries** — a single table (like the original HERO-SCROLL-BEHAVIOR.md) that maps heroProgress bands to “what the user sees” for both desktop and mobile.

The **initial** version was doing the right thing for the cinematic scroll because it combined a single driver, a locked frame, and disciplined narrative transitions with a clear, documented timeline. Later patches fixed real issues but sometimes changed that behavior; aligning the current implementation with the points above will bring it back in line with that initial intent.
