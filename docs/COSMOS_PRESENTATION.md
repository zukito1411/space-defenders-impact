# Cosmos presentation

Four finite art directions replace the original space cloud/galaxy combination:

| Stages | Region | Landmark |
| --- | --- | --- |
| 1–4 | Stellar Nursery | Blue atmospheric planet |
| 5–8 | Amber Ringway | Ringed gas giant |
| 9–12 | Silent Fleet | Broken orbital habitat |
| 13 onward | Violet Deepfield | Shattered capital ship |

Campaign and Boss Rush stages 5 and 10 retain their ocean and volcanic arenas (Pelagic Expanse and Cinder Rift); active special bosses also retain their arena overrides. Stage 15 retains its final battle foreground. Arrival cards use the same campaign arena mapping. The existing raid warp/flash and menu-only door behavior are unchanged.

## Art and sound

- `cosmos-regions-v1.webp`: four original ImageGen nebula plates, normalized to a 1024² atlas with 4px extruded cell gutters. Sampling excludes those gutters. The quiet centers protect projectile contrast, and backgrounds fill the viewport at any aspect ratio.
- `cosmos-landmarks-v1.webp`: four original ImageGen landmarks. Near-zero alpha noise was discarded before trimming and fitting each silhouette into a 456px envelope with transparent gutters. Shared upper-left lighting, no runtime lighting shader.
- `cosmos-hull-v1.ogg`: original synthesized 24-second stereo loop. Baked hull harmonics, airy overtone bed and slow periodic modulation; no external samples. Region pitch and boss attenuation vary one shared loop. It represents the ship interior, rather than sound propagating through space.

All three files are loaded/cached before gameplay and included in the production packaging verifier. Source textures are shared for the application lifetime, like the existing combat atlases; scene instances do not duplicate them. An unavailable atlas preserves original scenery.

## Rendering budget

- Two additional shared 1024² RGBA sources: 8 MiB nominal GPU texels, no mipmaps. Decoded browser images and driver bookkeeping are additional memory. WebP download size does not equal decoded size.
- Reuses the existing two galaxy, first planet, first scenic and asteroid sprite slots. No additional per-frame sprite creation.
- At steady state one opaque backdrop replaces the old base quad, old galaxies, cloud gradients, ambient gradient washes and default space surface gradients. Only the two existing galaxy slots participate in a 2.4s region crossfade. Low quality uses one backdrop without a crossfade or orbital/foreground landmarks.
- Planet/ring reveals continue across consecutive stages in a region and reset for a new run or arena change. Abandoned structures use slow transforms, regional tints and stronger parallax than distant dust. No rotating billboard planets, blur, full-screen bloom or new render target.
- Medium reserves one asteroid slot for occasional edge passes; high/ultra reserve two staggered slots. Passes last 3.2s per 26s cycle, stay near the screen edges and replace normal asteroid slots. Gameplay collision objects are unaffected.
- Ship ambient rim light changes the color of its existing cached glow; shield, invulnerability, burning and cooperative identity effects retain priority. The existing glow cache remains capped at 48 entries.
- One ambience element, one 5Hz control timer, no audio work in the render loop. Master/music gain, mute, pause, document visibility, autoplay failures and unmount are handled. Arrival text animates opacity/translation in CSS, honors reduced motion, and does not restart on pause/resume.

## Verification

`node scripts/test-cosmos.mjs` checks region/arena selection, atlas sharing and gutters, first-start arrival, pause/resume, audio mute/visibility/cleanup, and production scene method transforms across low/medium/high quality, multiple stage themes and long elapsed times. Pixi and browser/audio objects are stand-ins: these are behavioral/budget checks, not a real GPU benchmark.

Also run `npm run build` and the existing raid travel, missile/depth, combat, engine, nuke, boss art, spatial hash and space-door checks. The build verifies the new files in `dist`; PWA packaging includes WebP and OGG assets.

A local Chromium attempt was blocked by the host's socket restriction. Actual game screenshots, frame-time/GPU costs and device FPS have not been measured for this pass. Fixed counts and fewer gradient layers constrain cost, but cannot prove zero FPS regression. Device comparison should use the same resolution, quality and scene (especially stage 13 and Boss Rush), warm assets first, and compare p95 frame time plus sustained FPS with the previous build using the existing performance HUD.
