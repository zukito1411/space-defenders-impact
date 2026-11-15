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

The weather pass adds a generated 1536x1024 RGBA atlas containing ocean storm
clouds, volcanic ash, sea spray and eruption smoke. The original alpha is retained
in a 365 KB WebP, with source hashes and cell layout recorded in
`planet-weather-art-manifest.json`. Frames share one loaded texture source.
Pelagic's sea spray and Cinder's smoke use their own atlas cells.

Airborne particles now occupy three depth bands: cool drifting moisture over
Pelagic, and normally blended ash flakes mixed with additive embers over Cinder.
Tapered horizontal wind streaks have a fine bright core, vary in length with
thrust, and stay near the upper/lower edges of the flight lane. Their absolute
time transport agrees at 30/60/144 Hz, and changing thrust does not teleport
particles. High quality uses 72 motes and 20 streaks; medium uses 42/12 and low
uses 18/5. Reduced motion suppresses both pools.

The animated sky pass adds forty textured stars above each planet's cloud line
(24 on medium, 14 on low). Each has a different 3.2-8.6 second twinkle cycle;
there is no synchronized flash. Clouds drift while their width, height, opacity
and angle change slightly over longer cycles. Existing terrain and vector details
retain their artwork and geometry. All newly added celestial detail uses the
transparent raster atlas in `celestial-art-manifest.json`.

The cosmos receives separate textured gas ribbons and fine dust near its edges,
with slow drift, breathing, rotation and regional colors. These are additional
layers behind the existing planets, wrecks and fleet scenery. Existing cosmos
plates, objects and geometric effects have not been redrawn or replaced.

Both scenes keep their detailed terrain in the lower portion of the view and
use subdued cloud colors behind the flight lane. Foreground combat retains its
existing layer order. Existing descent/ascent opacity blends apply to the whole
planet scene. Portrait flight continues to use its overhead surface renderer.

## Implementation and limits

- `src/components/games/raid/planetAtmosphereArt.ts`: deterministic periodic
  terrain profiles, rock/cloud raster recipes and orientation/quality sampling.
- `src/components/games/raid/landscapeAtmosphere.ts`: owns the horizon scene,
  cached materials, parallax, moisture, ash, vent registration and teardown.
- `src/components/games/raid/planetFlightParticles.ts`: particle depth, wind
  transport, edge fading, throttle response and crisp streak geometry.
- `celestialArt.ts`, `celestialMotion.ts`, `celestialScenery.ts`: one shared
  star/nebula atlas, independent twinkle sampling, paused time and pooled detail
  sprites. Planet skies use only the star pool; cosmic gas stays in space.
- `src/components/games/raid/surfaceArt.ts` and `preload.ts`: shared generated
  weather frames, offline asset URLs and cache revision.
- `src/components/games/raid/background.ts`: warms and attaches the scene,
  selects the world, hides redundant overhead scenery and blends the journey.
- `src/components/games/raid/GradiusRaidRuntime.tsx`: supplies the pause flag.
- `scripts/test-planet-atmosphere.mjs`: materials, periodic profiles, orientation,
  bounded objects, quality, pause/resume, reduced motion and texture cleanup.
- `scripts/test-cosmos.mjs`: atmosphere dependency added to its isolated harness.
- `.github/workflows/verify.yml`: runs the new test.
- `docs/raid-performance.md` and this document describe rendering and validation.

Materials are baked during renderer loading. Rock detail reuses the bundled
basalt material. The scene owns 13 textures, approximately 11.45 MiB of base RGBA
pixels plus mipmaps, and borrows the six-MiB shared weather atlas. There is a
fixed pool of 122 sprites with one short lightning path. The celestial atlas adds
six MiB shared across planet skies and space. Two fixed 79-sprite detail pools
provide sky stars and cosmic gas/dust; only the appropriate scene is visible.
Cloud and mote
visibility falls with the quality profile; low quality retains the horizon and
terrain. Frame updates reuse textures and display objects, without pixel reads
or raster regeneration. Owned textures are destroyed with the background.

Reduced motion freezes atmospheric travel and removes airborne motes and storm
flickers. The atmosphere's own clock freezes on pause and resumes without a
wall-clock jump. Existing top-down motion has its original behavior.

## Verification

- TypeScript and production build, including bundled asset checks, passed.
- All 35 source test scripts passed using LF-normalized source reads for older
  Windows-sensitive extraction harnesses; the new atmosphere test passes directly.
- Real Chromium/Pixi captures cover both planets at 1920x940, 844x390, 640x320
  low quality and 844x390 reduced motion. Object budgets, upright orientation,
  pause, portrait fallback and return to space were checked.
- Local test-only seeded stages 5 and 10 passed actual carrier launch and combat
  rendering at 1600x850, with no page errors or horizontal page overflow. Source
  seed values and the user's progression were not changed.
- Physical Android GPU cost and device appearance remain unmeasured.
- Additional real-renderer captures at 1600x850 and 844x390 verify changing star
  brightness, animated cloud/gas transforms, frozen pause and reduced motion.
  A short real-time recording covers Pelagic, Cinder and the cosmos at 844x390.

Ignored review captures live under `tmp/playtest/`, including
`pelagic-live-game-finished.png`, `cinder-live-game-finished.png`, and the
`*-desktop-finished.png`, `*-mobile-finished.png` and `*-compact-low-finished.png`
renderer captures.
The animated preview is `tmp/playtest/atmosphere-cosmos-animated.webm`; the newer
still captures use `*-celestial-desktop-v1.png` and `*-celestial-mobile-v1.png`.
