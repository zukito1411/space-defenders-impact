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
- Expensive background vector tessellation retains its existing 40/80 ms cache cadence; scrolling world sprites and foreground transforms update on every submitted frame. This is a geometry cache, not a foreground frame cap.

## Optional instrumentation

The performance HUD records frame intervals in a fixed 256-sample ring. It sorts a scratch copy once per report and shows p50/p95/p99 frame intervals alongside CPU simulation/draw timings, GPU submission time, draw-layer costs, object counts and DPR. These intervals describe callback pacing, not proof that every submitted frame reached the display.

GPU timing queries run only while the HUD is enabled, at most once every 300 ms, and are read only after the driver reports completion. Ordinary play does not poll GPU timing. No synchronous GPU wait or pixel readback is introduced.

## Verification boundary

Validation for this change is TypeScript checking only. The game was not launched; Playwright, device profiling and production builds were not run. No before/after FPS, percentile improvement, zero-stutter guarantee or hardware-performance claim has been established.

A later authorized device comparison should use the same viewport, display rate, quality, ship/loadout and busy-wave/boss/co-op scenario. Check frame percentiles, texture upload behavior, memory, input response, warning readability and WebGL/Canvas fallback before claiming a measured improvement.
