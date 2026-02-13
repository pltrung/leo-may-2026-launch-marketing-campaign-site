# UX Reference: In-Dinner Lunar New Year

Design notes from the In-Dinner reference app (Lunar New Year 2026 mini game) applied to Leo Mây.

## Reference patterns

1. **Framer Motion** — Spring physics, AnimatePresence for exit animations
2. **Step transitions** — One view at a time, clean unmount/remount
3. **Modal entrances** — Scale + spring, backdrop fades first
4. **Staggered reveals** — Delay on sequential elements
5. **Minimal text** — Heavy atmosphere over form-heavy UI

## Leo Mây implementation

The Leo Mây landing experience follows these patterns:

- **components/leo/** — Immersive views (Intro → Clouds → Personality → Signup → Success)
- **AnimatePresence** — Step transitions with exit animations
- **Atmosphere** — Dreamlike gradient background, pointer-events: none
- **CloudBlob** — Organic cloud shapes for personality selection
