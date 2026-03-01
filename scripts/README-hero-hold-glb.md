# Hero-hold GLB optimization

`public/glb-leo-climbing-hold.glb` is used on the initial hero screen. To make it load and render faster on mobile and desktop:

## 1. Optimize the asset (one-time)

From repo root (Node/npx required):

```bash
npm run optimize:hero-hold
```

This runs `scripts/optimize-hero-hold-glb.sh`, which:

- Resizes textures to max 1024×1024
- Welds vertices and simplifies the mesh (keeps ~40% of triangles)
- Compresses geometry with meshopt (no extra runtime decoder)
- Prunes unused data

The script **overwrites** `public/glb-leo-climbing-hold.glb`. Back up the original if you need it. After running, the hero screen will use the smaller, lighter GLB.

## 2. Runtime (already applied)

- **Mobile:** `dpr` capped at 1, antialias off.
- **Desktop:** `dpr` capped at 1.5 (was 2) to reduce fill rate; antialias on.

If the hero hold still feels heavy on low-end devices, you can lower the simplify ratio in the script (e.g. `--ratio 0.3` for fewer triangles).
