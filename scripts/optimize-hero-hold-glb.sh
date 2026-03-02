#!/usr/bin/env bash
# Optimize glb-leo-climbing-hold.glb for web and mobile: small file, fast load, stable scroll.
# Run from repo root: npm run optimize:hero-hold
# Requires: Node/npx. Output overwrites public/glb-leo-climbing-hold.glb.
# Targets: mesh compression, texture resize+WebP, dedup, join (fewer draw calls), prune.

set -e
INPUT="${1:-public/glb-leo-climbing-hold.glb}"
OUTPUT="${2:-public/glb-leo-climbing-hold.glb}"
WORK="/tmp/hero-hold-glb-optimize"
mkdir -p "$WORK"

echo "Input:  $INPUT"
echo "Output: $OUTPUT"

echo "Step 1/8: Copy (normalize)…"
npx --yes @gltf-transform/cli@4 copy "$INPUT" "$WORK/copied.glb"

echo "Step 2/8: Resize textures (max 512px for hero hold on screen)…"
npx --yes @gltf-transform/cli@4 resize "$WORK/copied.glb" "$WORK/resized.glb" --width 512 --height 512

echo "Step 3/8: WebP texture compression (no extra runtime decoder)…"
npx --yes @gltf-transform/cli@4 webp "$WORK/resized.glb" "$WORK/webp.glb" 2>/dev/null || cp "$WORK/resized.glb" "$WORK/webp.glb"

echo "Step 4/8: Deduplicate accessors and textures…"
npx --yes @gltf-transform/cli@4 dedup "$WORK/webp.glb" "$WORK/dedup.glb"

echo "Step 5/8: Weld + simplify mesh (keep ~30% tris for mobile stability)…"
npx --yes @gltf-transform/cli@4 weld "$WORK/dedup.glb" "$WORK/welded.glb"
npx --yes @gltf-transform/cli@4 simplify "$WORK/welded.glb" "$WORK/simplified.glb" --ratio 0.3

echo "Step 6/8: Join meshes (reduce draw calls)…"
npx --yes @gltf-transform/cli@4 join "$WORK/simplified.glb" "$WORK/joined.glb" 2>/dev/null || cp "$WORK/simplified.glb" "$WORK/joined.glb"

echo "Step 7/8: Meshopt compress (no runtime decoder)…"
npx --yes @gltf-transform/cli@4 meshopt "$WORK/joined.glb" "$WORK/compressed.glb"

echo "Step 8/8: Prune unused…"
npx --yes @gltf-transform/cli@4 prune "$WORK/compressed.glb" "$WORK/optimized.glb"

cp "$WORK/optimized.glb" "$OUTPUT"
echo "Done. Optimized: $OUTPUT"
ls -la "$INPUT" "$OUTPUT"
