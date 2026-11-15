# Pelagic and Cinder landscape atmospheres

Landscape flight now has a visible planetary horizon instead of a full-screen
gradient with overhead terrain hidden. A dedicated upright scene is placed
inside the game's rotated logical playfield.

**Pelagic Expanse** has layered rocky coastlines, a reflective ocean, cyan
shore highlights, drifting moisture, cloud banks and pale horizon haze. Water
highlights drift gently. A short, distant storm fork can appear every 19 seconds
on higher quality settings; it is local to the cloud bank rather than a screen
flash.

**Cinder Rift** has three depths of fractured volcanic ridges, branching lava
flows, slowly pulsing vent light, rising ash plumes, embers and a warm smog
horizon. Vents and plumes use the same panorama coordinates as their volcanoes
so they stay attached while the terrain scrolls.

Both scenes keep their detailed terrain in the lower portion of the view and
use subdued cloud colors behind the flight lane. Foreground combat retains its
existing layer order. Existing descent/ascent opacity blends apply to the whole
planet scene. Portrait flight continues to use its overhead surface renderer.

## Implementation and limits

- `src/components/games/raid/planetAtmosphereArt.ts`: deterministic periodic
  terrain profiles, rock/cloud raster recipes and orientation/quality sampling.
- `src/components/games/raid/landscapeAtmosphere.ts`: owns the horizon scene,
  cached materials, parallax, moisture, ash, vent registration and teardown.
- `src/components/games/raid/background.ts`: warms and attaches the scene,
  selects the world, hides redundant overhead scenery and blends the journey.
- `src/components/games/raid/GradiusRaidRuntime.tsx`: supplies the pause flag.
- `scripts/test-planet-atmosphere.mjs`: materials, periodic profiles, orientation,
  bounded objects, quality, pause/resume, reduced motion and texture cleanup.
- `scripts/test-cosmos.mjs`: atmosphere dependency added to its isolated harness.
- `.github/workflows/verify.yml`: runs the new test.
- `docs/raid-performance.md` and this document describe rendering and validation.

Materials are baked during renderer loading. Rock detail reuses the bundled
basalt material. There are no new downloaded images or media files. The scene
owns 11 shared textures, approximately 11.44 MiB of base RGBA pixels plus mipmaps,
and a fixed pool of 50 sprites with one short lightning path. Cloud and mote
visibility falls with the quality profile; low quality retains the horizon and
terrain. Frame updates reuse textures and display objects, without pixel reads
or raster regeneration. Owned textures are destroyed with the background.

Reduced motion freezes atmospheric travel and removes airborne motes and storm
flickers. The atmosphere's own clock freezes on pause and resumes without a
wall-clock jump. Existing top-down motion has its original behavior.

## Verification

- TypeScript and production build, including bundled asset checks, passed.
- All 34 source test scripts passed using LF-normalized source reads for older
  Windows-sensitive extraction harnesses; the new atmosphere test passes directly.
- Real Chromium/Pixi captures cover both planets at 1920x940, 844x390, 640x320
  low quality and 844x390 reduced motion. Object budgets, upright orientation,
  pause, portrait fallback and return to space were checked.
- Local test-only seeded stages 5 and 10 passed actual carrier launch and combat
  rendering at 1600x850, with no page errors or horizontal page overflow. Source
  seed values and the user's progression were not changed.
- Physical Android GPU cost and device appearance remain unmeasured.

Ignored review captures live under `tmp/playtest/`, including
`pelagic-live-game-finished.png`, `cinder-live-game-finished.png`, and the
`*-desktop-finished.png`, `*-mobile-finished.png` and `*-compact-low-finished.png`
renderer captures.
