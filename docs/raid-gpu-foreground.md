# Air Raid hybrid GPU foreground (v14+)

Air Raid now uses **one PixiJS WebGL renderer** for both world scenery and high-volume foreground actors, while retaining the transparent Canvas 2D overlay for advanced boss and player presentation.

## Migrated to Pixi/WebGL

- Regular alien ships use pooled Pixi sprites. Their color treatment is prepared once into small, bounded texture buckets; image placement and a subtle brightness pulse happen in the GPU sprite batch.
- Alien glows share cached textures rather than repeatedly drawing Canvas radial filters.
- Common player and enemy bullets use cached orb/trail textures, a shared GPU container and a bounded pool of 192 inactive sprites. Guest client-side predicted shots are handled separately from host shots.
- Sparks and ripples use one additive Pixi Graphics layer instead of individual Canvas draws.
- The same Pixi application presents updated background scenery and foreground actors once per game frame. Background geometry retains its lower refresh schedule and foreground positions update on each animation frame.
- Actual viewport dimensions and the existing 64–144 CSS-pixel overscan decide which GPU objects become visible.
- Invisible objects remain in the authoritative simulation until their own physics, collision, stage or lifetime logic ends.

## Preserved in Canvas 2D

Player and ally ships, mini-bosses and bosses, sophisticated weapon animations, long beam columns, attack warnings and full-screen cutscene overlays still render in Canvas 2D. Their combat logic and hitboxes are unchanged. This is an incremental migration, not a pixel-identical full engine replacement.

## Runtime safety

If WebGL initialization or the GPU actor scene fails, the gameplay Canvas path continues drawing actors, while Pixi scenery is presented if possible. GPU sprite instances are recycled in bounded pools. Unused texture entries are retired without deleting the shared Canvas sprite cache contents.

The static art of normal aliens uses a baked filter with slight GPU-based pulsing, which is visually close to but not pixel-identical to the previous animated Canvas color filter. Existing effects layering may differ slightly when the advanced Canvas layer overlaps GPU actors.

## Profiling and remaining work

The JavaScript/TypeScript and Android APK CI pipelines validate compilation and packaging, **not measured on-device FPS**. Test a normal wave, several dozen incoming shots, a boss fight and co-op on the same phone. Profile p50/p95/p99 frame times and first-time GPU uploads. Further candidates include complex projectile effects and cached ship/boss textures, provided draw-order regressions are addressed.
