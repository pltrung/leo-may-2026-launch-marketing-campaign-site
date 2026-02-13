# UX Comparison: In-Dinner Lunar New Year vs Leo Mây

## In-Dinner (reference) — what makes it feel modern & immersive

### 1. **Motion library: Framer Motion**
- Every transition uses `motion` + `initial` / `animate` / `exit` with **spring physics** (stiffness, damping).
- **AnimatePresence** wraps conditional content so exit animations run (no instant disappear).
- **layout** prop on list containers = smooth reflow when order changes (leaderboard ranks).

### 2. **Layering & z-index**
- Clear stacking: `CountdownZeroOverlay` (z-40) → `HorseGallop` → `ResultsModal` (z-60).
- Backdrop dims first, then content animates on top.
- Fixed overlays with `pointer-events` control so the sequence feels staged.

### 3. **Modal / card entrances**
- Results modal: `initial={{ opacity: 0, scale: 0.85 }}` → `animate={{ scale: 1 }}` with **spring** (stiffness: 300, damping: 24).
- Exit: `exit={{ opacity: 0, scale: 0.95 }}` for a smooth dismiss.
- Not just fade — scale makes it feel “present” and modern.

### 4. **Staggered reveals**
- PremiumPodium columns: `transition={{ delay: 0.15 + index * 0.1 }}` so items appear one after another.
- Leaderboard rows: `initial={{ opacity: 0, y: 10 }}` + spring animate.

### 5. **Decorative motion**
- CSS keyframe glows: `.rank-glow`, `.team-reveal-glow` (pulsing), `.sparkle-dot` (subtle pulse).
- Shine sweep on 1st place: moving gradient `animate={{ x: ["-100%", "200%"] }}` with repeat.

### 6. **Background depth**
- `background-attachment: fixed` for a sense of depth.
- Layered gradients (not flat).

---

## Leo Mây (current) — gaps vs In-Dinner

| Aspect | In-Dinner | Leo Mây (before fix) |
|--------|-----------|----------------------|
| Motion | Framer Motion (spring, AnimatePresence) | CSS keyframes only |
| Step change | N/A (single view + overlays) | Instant swap, no exit animation |
| Modals | Scale + spring entrance, exit animation | CSS `countUp` opacity only |
| List/card entrance | Staggered delay + spring | No stagger |
| Overlays | Backdrop fades in, then content | Backdrop + content together |
| Feel | Layered, cinematic, “alive” | Clean but static |

---

## Changes applied to Leo Mây

1. **Add Framer Motion** — step transitions use AnimatePresence + motion with spring.
2. **Step enter/exit** — each step fades and slides (opacity + y); exit runs before next step.
3. **Modal entrances** — CloudDetail, SignupModal, Success use scale + spring like ResultsModal.
4. **Stagger** — Reveal (logo → title → CTA) and CloudDetail (title → body → button) use delay.
5. **Backdrop then content** — overlay backdrop animates in first, then card scales in.
6. **Success** — position count-up + subtle scale/glow so it feels like a reward.

Result: Same design language as In-Dinner (layered, motion-driven, modern) while keeping Leo Mây’s mist/minimal look.
