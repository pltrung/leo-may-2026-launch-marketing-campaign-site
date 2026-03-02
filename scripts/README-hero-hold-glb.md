# Hero-hold GLB optimization

`public/glb-leo-climbing-hold.glb` is used on the initial hero screen. Goals: **small file**, **fast initial load**, **smooth scroll**, **stable on mobile** (no crash). The asset is optimized for web delivery (no Draco runtime; meshopt + WebP where supported).

## 1. Optimize the asset (run after replacing the GLB)

From repo root (Node/npx required):

```bash
npm run optimize:hero-hold
```

This runs `scripts/optimize-hero-hold-glb.sh`, which:

- **Copy** — normalize the glTF
- **Resize** — textures max 512×512 (hero hold is small on screen)
- **WebP** — texture compression (no extra runtime decoder; skip if CLI lacks it)
- **Dedup** — remove duplicate accessors and textures
- **Weld + simplify** — merge vertices, keep ~30% of triangles for mobile stability
- **Join** — join meshes to reduce draw calls (skip if not supported)
- **Meshopt** — compress geometry (no runtime decoder)
- **Prune** — remove unreferenced data

The script **overwrites** `public/glb-leo-climbing-hold.glb`. Back up the original if you need it. After running, the hero screen uses a smaller, lighter GLB for faster load and stable scroll.

## 2. Runtime (already applied)

- **Mobile:** `dpr` [1, 1], antialias off, 100ms defer before Canvas mount; material opacity updated only when changed (reduces per-frame work during scroll).
- **Desktop:** `dpr` [1, 1.5], antialias on.
- **Preload:** `preloadHeroClimbingHoldGLB()` is called early so the GLB starts loading before the hero is visible; layout preloads the asset as `fetch`.
- **Stability:** Progress and opacity are clamped; GLB layers stay mounted (visibility/opacity only); no scroll-driven mount/unmount.

If the hero hold still feels heavy on low-end devices, lower the simplify ratio in the script (e.g. `--ratio 0.25`).
