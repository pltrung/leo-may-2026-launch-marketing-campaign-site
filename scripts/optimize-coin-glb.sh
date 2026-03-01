#!/usr/bin/env bash
# Optimize leo-may-coin.glb: decompress/normalize, smaller file, lower poly for faster load and render.
# Run from repo root: npm run optimize:coin  (or: bash scripts/optimize-coin-glb.sh)
# Requires: Node/npx. Uses @gltf-transform/cli via npx.
# Optional args: INPUT [OUTPUT]. Default: public/leo-may-coin.glb → public/leo-may-coin.glb

set -e
INPUT="${1:-public/leo-may-coin.glb}"
OUTPUT="${2:-public/leo-may-coin.glb}"
WORK="/tmp/coin-glb-optimize"
mkdir -p "$WORK"

echo "Input:  $INPUT"
echo "Output: $OUTPUT"
echo "Step 1/5: Copy (normalize / decompress if Draco-packed)…"
npx --yes @gltf-transform/cli@4 copy "$INPUT" "$WORK/copied.glb"

echo "Step 2/5: Resize textures (max 1024px)…"
npx --yes @gltf-transform/cli@4 resize "$WORK/copied.glb" "$WORK/resized.glb" --width 1024 --height 1024

echo "Step 3/5: Weld vertices then simplify mesh (keep ~30% tris for lighter render)…"
npx --yes @gltf-transform/cli@4 weld "$WORK/resized.glb" "$WORK/welded.glb"
npx --yes @gltf-transform/cli@4 simplify "$WORK/welded.glb" "$WORK/simplified.glb" --ratio 0.3

echo "Step 4/5: Compress geometry (meshopt, no extra runtime decoder)…"
npx --yes @gltf-transform/cli@4 meshopt "$WORK/simplified.glb" "$WORK/compressed.glb"

echo "Step 5/5: Prune and copy to output…"
npx --yes @gltf-transform/cli@4 prune "$WORK/compressed.glb" "$WORK/optimized.glb"

cp "$WORK/optimized.glb" "$OUTPUT"
echo "Done. Optimized file written to: $OUTPUT"
ls -la "$INPUT" "$OUTPUT"
