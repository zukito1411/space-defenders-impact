# Derelict ship and station variety

The previous nine gameplay variants all referenced the same station image. Eight
new designs now serve both gameplay hazards and background scenery. IDs 0–3 are
fractured carrier, cargo hauler, exploration cruiser and alien husk. IDs 4–7 are
broken habitat ring, solar research station, orbital refinery and communications
hub. ID 8 retains the original station for existing serialized variants and
missing-art fallback. Gameplay dimensions, HP, velocities and collision rules are
unchanged.

Gameplay chooses a different ID on each spawn, with equal probability among the
remaining eight choices; the existing co-op `variant` field carries it. Background
slots walk deterministic permutations, changing design only at padded offscreen
wraps. The final fleet's main ship and secondary station keep the same identities
through stages 11–15, with a new choice available on subsequent runs. Low/medium
quality limits and existing sprite pool sizes are preserved.

## Asset and rendering costs

Two 1024×1024 transparent WebP atlases total 426,716 bytes (~417 KiB). Four 512px
cells per atlas have at least 28px transparent gutters; runtime frames are 464px.
Two shared HTML images supply Canvas and Pixi. GPU frames share exactly two
RGBA sources: nominal 8 MiB without mipmaps. Canvas extracts at most eight 464px
frames once (6.57 MiB RGBA); existing filtered-sprite caches remain subject to
their original byte/count limits. Art is preloaded and included in persistent
caches, service-worker precache and production packaging verification.

Hull shading and small emergency lights are baked into the art. Solid scenery
uses alpha 1 and existing distance tint/depth sorting. The old capital/ring bloom
mask is suppressed for these different silhouettes. Gameplay wreck drawing no
longer applies a live 14px Canvas shadow blur. No new sprites, particles, dynamic
blur passes, render targets or per-frame texture uploads are introduced.

The generation prompts, source/output hashes, frame layout and byte counts are in
`wreck-art-manifest.json`; `scripts/assets/normalize-wrecks.py` repeats crop,
alpha cleanup and sizing from the two raw source sheets.

## Validation

`node scripts/test-wreck-variety.mjs` checks every design permutation, gameplay
anti-repeat selection, atlas hashes/dimensions/gutters, shared decode/texture
sources, one-time Canvas crops and source failure behavior.
`node scripts/test-cosmos.mjs` exercises the actual scene methods with device
stand-ins: portrait, landscape and ultrawide wrap bounds, stable fleet identity,
opaque hulls, missing old bloom masks and fixed sprite counts. The full existing
regression scripts and production build also pass.

Generated and normalized art was visually inspected. Automated scene checks run
without a browser/GPU; they do not establish device FPS or replace an Android
playtest. Texture memory increases by the bounded amounts above.
