# Ascension flame spike aura — revert verification

Verified against git history (repo pulled, then `git log` / `git show` used to trace PRs).

## Relevant commits

- **179a5fc** — *Ascension for all 6 clouds, Vietnamese rewards, climbers count under progress*  
  Introduced: `lib/ascensionEnergy.ts`, `getAscensionEnergyVars`, burst + wind (state, effect, DOM), PART 5 wind streaks CSS, `.evolution-ascension-burst`, `.evolution-ascension-wind`, `.evolution-wind-streak`, `ascensionOscillate` (mascot wobble), cau_vong `--ascension-gradient`.

- **5d113aa** — *Ascension flame spike aura: 7-stage spike system, flame gradient, team signatures, distortion (Stage 6)*  
  Introduced: spike constants (`ASCENSION_SPIKE_COUNT`, etc.), `#mascot-ascension-aura` block (distortion, flame gradient, signature, spikes SVG), and ~176 lines of CSS (`.mascot-ascension-aura`, `.ascension-spikes-svg`, `.ascension-spike`, `.ascension-flame-gradient`, `.ascension-signature`, team signatures, `.ascension-distortion`, keyframes).

The revert removes all **flame spike** UI from 5d113aa and all **burst + wind** UI from 179a5fc. It keeps `getAscensionEnergyVars` and `lib/ascensionEnergy.ts` (and related CSS vars) because other evolution layers still use them.

## What was reverted (checklist)

| Item | Location | Reverted? |
|------|----------|-----------|
| **DOM: mascot ascension aura block** | `app/[locale]/countdown/page.tsx` | ✅ Yes — no `#mascot-ascension-aura` or `.mascot-ascension-aura` div; no flame gradient, signature, or spikes SVG |
| **DOM: evolution-ascension-burst** | `page.tsx` | ✅ Yes — no burst element |
| **DOM: evolution-ascension-wind + wind streaks** | `page.tsx` | ✅ Yes — no wind container or streak elements |
| **State/refs for burst** | `page.tsx` | ✅ Yes — no `ascensionBurstKey`, `prevEvolutionStageIndexRef`, or effect that triggers burst |
| **Constants for spikes/wind** | `page.tsx` | ✅ Yes — no `ASCENSION_SPIKE_*`, `spikeCount`, `stageSpikeOpacity`, `windStreaks` |
| **CSS: .mascot-ascension-aura, #mascot-ascension-aura** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .ascension-spikes-svg, .ascension-spike, keyframes** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .ascension-flame-gradient, ascensionFlameBreath** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .ascension-signature, team signatures, ascensionSkillFadeInOut, gioWindFadeInOut** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .ascension-distortion, ascensionDistortionPulse** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .evolution-ascension-burst, ascensionBurst** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: .evolution-ascension-wind, .evolution-wind-streak, windStreakUp** | `styles/globals.css` | ✅ Yes — removed |
| **CSS: PART 5 team-specific wind streaks** | `styles/globals.css` | ✅ Yes — removed (PART 6 renumbered to PART 5) |

**Grep:** No remaining matches for the reverted identifiers in `page.tsx` or `globals.css`.

## Intentionally kept (used by evolution, not flame-only)

| Item | Why kept |
|------|----------|
| `lib/ascensionEnergy.ts` + `getAscensionEnergyVars` | Still used on mascot wrapper for `--ascension-primary`, `--ascension-secondary`, `--ascension-accent`, `--ascension-gradient`. These drive **evolution-reflective-back**, **cau_vong** gradient, and other evolution layers — not the removed flame UI. |
| `style={getAscensionEnergyVars(cloud.id)}` on mascot wrapper | Needed so evolution-aura-ring, evolution-reflective-back, evolution-energy-core, evolution-mist, and cau_vong ::before can use the vars. |
| `--ascension-gradient` in `.evolution-reflective-back` (cau_vong) | Part of evolution styling, not the removed ascension signature. |
| `ascensionOscillate` keyframe | Used by `.evolution-mascot-inner` for the small translateY wobble at stage 4/5. Name is historical; behavior is general mascot motion. |

## Grep verification (no flame-specific leftovers)

- No matches for: `mascot-ascension`, `ascension-aura`, `ascension-spike`, `ascension-flame`, `ascension-signature`, `ascensionBurst`, `evolution-ascension`, `wind-streak`, `windStreak` in the repo.

**Conclusion:** The ascension **flame spike aura** (spikes, flame gradient, team signature, distortion, burst, wind) is fully reverted. Evolution layers (aura ring, reflective back, energy core, mist, orbit particles, mascot inner) and the shared `ascensionEnergy` vars remain so the rest of the evolution system still works.
