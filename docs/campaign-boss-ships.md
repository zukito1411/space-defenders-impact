# Dedicated campaign boss ships

Stages 1–4, 6–9 and 11–14 previously selected an enlarged normal/elite image using
`enemy.id + variant * 11 + pattern * 3`. This made the same encounter change its
appearance between runs. The twelve stages now have purpose-built ships tied to
the original attack classes:

| Stage | Boss | Attack class | Visible armament |
| --- | --- | --- | --- |
| 1 | Crimson Bastion | Carrier | Five-port forward fan battery, side hangars |
| 2 | Amethyst Orrery | Orb | Eight radial emitter nodes |
| 3 | Verdant Reaper | Mantis | Outer needle guns, inner blade arms |
| 4 | Tidal Razor | Serpent | Three forward blade-launcher prongs |
| 6 | Cinder Gate | Gate | Four lane guns, central beam aperture |
| 7 | Ashen Ark | Carrier | Twin hangar spines, forward fan battery |
| 8 | Prism Sovereign | Orb | Angular reactor and eight weapon petals |
| 9 | Scythe Regent | Mantis | Crescent needle arms and inner blade launchers |
| 11 | Triarch Hydra | Hydra | Three weapon heads, central void emitter |
| 12 | Null Cathedral | Gate | Fortress pylons, four guns and central beam well |
| 13 | Eclipse Dreadnought | Carrier | Heavy fan battery, hangars and radial modules |
| 14 | Eventide Nexus | Orb | Eight armored reactor petals and emitters |

`bossCatalog.ts` is shared by spawning, sprite loading and UI. An optional
`bossArtStage` is selected once at spawn and retained by existing co-op snapshot
spreads/clones. Older packets select a deterministic default for their attack
class. Endless uses the latest eligible hull for the chosen class; its `super`
class uses the supreme carrier's combined fan/radial hull. No runtime ID enters
art selection. Normal enemies and elites retain their own assets.

The attack-class cycle and art identities remain stable. The current per-ship
attack sequences, HP/rank tuning and movement are described in
[command-boss-balance.md](command-boss-balance.md). Collision radii and entry
protection retain their existing rules. Stages 5/10/15 keep the
animated squid/snake/final models, including final mirages and rotation. Boss Rush
still uses those three special encounters. The Devil encounter is unchanged.

## Almanac and previews

The almanac replaces the standard/elite boss-pool strip with dedicated command
hulls. Its boss cards cover all fifteen campaign stages in order plus the Devil
anomaly. Stage-specific card keys and unlock thresholds distinguish later ships
in the same attack family. English, Chinese, Japanese and Korean descriptions
now explain the actual attack classes, rather than enlarged normal sprites.
Proper ship names are shared across languages.

Ordinary boss previews use lazy, asynchronously decoded `<img>` elements pointing
to the exact gameplay files, with `object-fit: contain`. They add zero RAF loops
and do not trigger raid-wide asset warming. Special animated previews retain their
existing Canvas renderer.

## Asset and rendering budget

The final assets are twelve transparent 512×512 WebP files in `public/assets/bosses`.
Each complete silhouette fits within 488px, leaving at least 12px safety padding.
The generated sources were edited for clean background alpha, then normalized by
`scripts/assets/normalize-campaign-bosses.py`. Prompts, source/output hashes,
content rectangles and file sizes are recorded in `campaign-boss-art-manifest.json`.
The twelve files total 1,044,554 bytes (~1 MiB) compressed. The raw sheets are not shipped.

At most twelve decoded RGBA sources add 12 MiB nominal pixel storage. Canvas
bodies draw one unfiltered bitmap per frame, retaining the original float and
bank motion. Lighting and small reactor highlights are painted into the source;
there are no extra body layers, live filters, blur passes, per-frame extraction
canvases, animation sheets or explicit Pixi texture uploads. Missing art uses a
simple command-hull fallback, never an unrelated normal enemy. Assets are decoded
through the existing launch preloader, included in offline caches (v9), and checked
in the built distribution before web/APK packaging.

## Verification

`node scripts/test-campaign-bosses.mjs` executes the real spawn callback, Canvas
routing, sprite cache, almanac construction and portrait component. It covers all
campaign stages, Boss Rush specials, Endless classes, serialized art identity,
missing art, sixteen distinct card keys, ordered unlocks in all four languages,
matching gameplay/preview URLs and zero added portrait animation loops. Asset
checks verify hashes, alpha WebP flags, bounds and gutters. Existing regression
scripts and the production build also run.

Normalized art is inspected over a dark background and at gameplay-sized scales.
The automated render checks use device stand-ins. GPU/browser and Android FPS
measurements are not available in this environment; device performance parity is
not claimed.
