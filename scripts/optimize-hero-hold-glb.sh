#!/usr/bin/env bash
# Optimize glb-leo-climbing-hold.glb for faster load and render on hero screen.
# Run from repo root: npm run optimize:hero-hold
# Requires: Node/npx. Output overwrites public/glb-leo-climbing-hold.glb.

set -e
INPUT="${1:-public/glb-leo-climbing-hold.glb}"
OUTPUT="${2:-public/glb-leo-climbing-hold.glb}"
WORK="/tmp/hero-hold-glb-optimize"
mkdir -p "$WORK"

echo "Input:  $INPUT"
echo "Output: $OUTPUT"
echo "Step 1/5: Copy (normalize)…"
npx --yes @gltf-transform/cli@4 copy "$INPUT" "$WORK/copied.glb"

echo "Step 2/5: Resize textures (max 1024px)…"
npx --yes @gltf-transform/cli@4 resize "$WORK/copied.glb" "$WORK/resized.glb" --width 1024 --height 1024

echo "Step 3/5: Weld + simplify mesh (keep ~40% tris for hero hold)…"
npx --yes @gltf-transform/cli@4 weld "$WORK/resized.glb" "$WORK/welded.glb"
npx --yes @gltf-transform/cli@4 simplify "$WORK/welded.glb" "$WORK/simplified.glb" --ratio 0.4

echo "Step 4/5: Meshopt compress…"
npx --yes @gltf-transform/cli@4 meshopt "$WORK/simplified.glb" "$WORK/compressed.glb"

echo "Step 5/5: Prune…"
npx --yes @gltf-transform/cli@4 prune "$WORK/compressed.glb" "$WORK/optimized.glb"

cp "$WORK/optimized.glb" "$OUTPUT"
echo "Done. Optimized: $OUTPUT"
ls -la "$INPUT" "$OUTPUT"
