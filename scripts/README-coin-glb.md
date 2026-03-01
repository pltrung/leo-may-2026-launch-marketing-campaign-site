# GLB optimization (coin + hero scroll)

Two GLBs are optimized with the same pipeline:

| Asset | Path | Use |
|-------|------|-----|
| **Coin** | `public/leo-may-coin.glb` | Countdown page coin entrance |
| **Hero climbing hold** | `public/glb-leo-climbing-hold.glb` | Hero scroll (initial GLB; not the island) |

## 1. Decompress / optimize

Run from repo root (Node/npx required):

```bash
# Optimize coin only
npm run optimize:coin

# Optimize hero scroll climbing-hold only
npm run optimize:hero-hold

# Optimize both
npm run optimize:glbs
```

The script (`scripts/optimize-coin-glb.sh`) does:

- **Copy** – Normalize / decompress if needed.
- **Resize textures** – Max 1024×1024.
- **Weld + simplify** – Keep ~30% of triangles for lighter render.
- **Meshopt** – Compress geometry (no extra runtime decoder).
- **Prune** – Remove unused data.

Custom input/output:

```bash
bash scripts/optimize-coin-glb.sh path/to/source.glb path/to/output.glb
```

## 2. Rendering (in app)

- Coin canvas: `dpr={[1, 1.5]}`, `powerPreference: "low-power"`.
- Hero hold and island use the same R3F stack; optimizing the GLBs reduces load and GPU cost.

## 3. Large source files

If the original is very large:

- **Textures** – Resize to 1024 (or 512) before export or in the script.
- **Poly count** – Tweak `--ratio 0.3` in `scripts/optimize-coin-glb.sh` (e.g. `0.2` for lighter, `0.5` for higher quality).

Each `npm run optimize:*` overwrites the corresponding file in `public/`.
