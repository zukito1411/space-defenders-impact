# Gradius Raid rendering and performance

The visible game submits one WebGL presentation and its Canvas overlay per native `requestAnimationFrame` callback. There is no application 60 FPS cap, no automatic 30 FPS fallback, and no automatic render-resolution reduction. The browser, display refresh rate and hardware still determine the attainable frame rate. Hidden tabs suspend the loop, and the existing 33 ms simulation-delta guard prevents a large resume jump.

The player's selected quality profile still controls its existing DPR and effect budgets. This change does not lower those profile values or remove ship/boss animations, warning beams, combat entities or collision checks.

## Rendering strategy

- One Pixi/WebGL renderer presents scenery, pooled aliens, projectile art, particles and impact animation. Canvas retains animated bosses, player ships, scripted weapon attacks, warning telegraphs and cutscenes.
- Ordinary player projectiles use generated atlas art, including plasma, lasers, spread shots, ion needles, rockets and homing missiles. Compatible enemy projectiles use the same source atlas. Their simulation objects, damage and hitboxes are unchanged.
- Two atlas images contain the combat artwork and sixteen explosion animation frames. Frame textures share the two underlying GPU sources instead of uploading one image per bullet or animation frame.
- Atlases decode in asset preloading, then upload through Pixi's preparation queue before a local run starts. Missing art keeps the original Canvas/cached-GPU paths available.
- The foreground prepares 256 reusable projectile nodes, 96 particle nodes, eight impact nodes and 48 alien sprite pairs during loading. These are warm reserves, not caps on live projectiles. Up to 512 inactive projectile nodes are retained for subsequent bursts.
- Additive energy and normally blended missile/smoke art use separate containers. This keeps material changes out of the middle of the main projectile batches.
- Numeric projectile keys replace per-frame source-prefix strings. Boss projectile transforms reuse one scratch record. Color parsing is cached. Each normal alien variant uses one high-detail raster rather than generating new size buckets after rotation or resizing.
- Original shockwave rings remain, with additional textured shock fronts, impact coronas and fire-to-smoke animation. Existing sparks gain textured streaks and fragments. Short muzzle flashes are local visual feedback, not additional network events.
- Cosmetic visibility culling does not remove authoritative combat objects. Existing broad-phase collision indexing, cosmetic retirement and bounded Canvas caches remain in place.
- Mastery engine trails retain the authored flame luminance and turbulence. Four cached thermal phases per ship palette combine the colored flame, white-hot core and compact shock diamonds. The normal engine's throttle length and flicker drive the trail; every outlet still submits one bitmap with a fixed nozzle root and width. Palette filtering runs during warmup rather than during flight.
- Force fields and shields use hull-fitted alpha contours for every normal/elite ship and mech action frame. Selected-ship warmup builds the outlines and four cached textures (force field, shield, combined and hull-clipped repair seams). A bounded 24-profile cache is shared across draw sizes; flight submits one shell bitmap, two short contour highlights and charge markers. After warmup, drawing performs no pixel reads, hex tessellation or blur filtering. Reduced motion freezes the highlights.
- Expensive background vector tessellation retains its existing 40/80 ms cache cadence; scrolling world sprites and foreground transforms update on every submitted frame. This is a geometry cache, not a foreground frame cap.
- Pelagic and Cinder landscape flight use a separate upright horizon scene: thirteen textures baked during loading, a shared generated weather atlas, 122 pooled sprites and a short local storm path. Three depths of moisture/ash, tapered wind streaks, spray and eruption smoke reuse their materials each frame; quality settings reduce clouds, airborne motes and streaks. The atmospheric clock pauses with the game. See `planet-landscape-atmosphere.md` for memory bounds and browser verification.
- Added celestial animation uses one shared raster atlas and two fixed 79-sprite pools. Planet skies show independently twinkling stars behind the clouds; space adds edge gas ribbons and faint dust behind existing landmarks. Every frame changes only pooled sprite transforms and alpha. The new layers add no procedural polygon/circle drawing, image filtering or pixel reads during flight, and freeze on pause or reduced motion.
- The cosmos background now samples a 2048² lossless remaster instead of its original 1024² compressed atlas. Each nebula region has 1008² stored texels with proportional gutters. Resampling/sharpening happens offline; rendering uses the same two backdrop slots and linear sampling. This adds twelve MiB of GPU texture pixels. It improves the display of existing source detail but cannot restore native detail absent from the original art.

## Optional instrumentation

The performance HUD records frame intervals in a fixed 256-sample ring. It sorts a scratch copy once per report and shows p50/p95/p99 frame intervals alongside CPU simulation/draw timings, GPU submission time, draw-layer costs, object counts and DPR. These intervals describe callback pacing, not proof that every submitted frame reached the display.

GPU timing queries run only while the HUD is enabled, at most once every 300 ms, and are read only after the driver reports completion. Ordinary play does not poll GPU timing. The instrumentation introduces no synchronous GPU wait or flight-time pixel readback.

## Verification boundary

The elite-trail and Space Jet shield update passed the production build and source regression checks. Browser captures compared the production drawing functions across normal and elite hulls, idle and boost, shield charge states, and both orientations. A live Space Jet carrier launch and flight check passed at 844x390 without page errors or horizontal overflow. The existing Windows source-extraction tests required in-memory LF normalization; the focused engine and shield scripts also passed directly.

No physical Android profiling, before/after FPS comparison, percentile improvement, zero-stutter guarantee or hardware-performance claim has been established.

A later authorized device comparison should use the same viewport, display rate, quality, ship/loadout and busy-wave/boss/co-op scenario. Check frame percentiles, texture upload behavior, memory, input response, warning readability and WebGL/Canvas fallback before claiming a measured improvement.

The Full HD scenery pass also remasters the two body and two wreck atlases to 2048 pixels, preserves larger original planets at load time, and permits DPR 2 for co-op Max. Those four atlases add 48 MiB of nominal GPU texture pixels relative to the earlier nebula-only remaster, plus variable legacy-planet and decoded-image memory. Sprite pools and flight-time filtering remain unchanged. See [ultra-scenery.md](ultra-scenery.md) for source-detail limitations and validation.
