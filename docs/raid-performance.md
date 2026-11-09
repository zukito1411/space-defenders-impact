# Air Raid viewport and rendering performance

This implementation adapts the patterns in `tales-of-leighneron-2-5d` (ChunkManager, chunkNeighborhood, GeographyWorker, RenderBudget) to the **100×100 logical Air Raid playfield**:

- Actual phone/tablet/desktop CSS dimensions determine the render overscan band, from 64 to 144 CSS pixels, converted separately into game-space X and Y margins.
- Background Pixi/WebGL geometry is refreshed at a separate cadence from gameplay. GPU-backed scenery stays smooth; Canvas 2D combat and input use the full requestAnimationFrame cadence.
- Normal enemies, shots, asteroids, pickups, sparks, ripples, wrecks and meteors are skipped during drawing when entirely outside the padded viewport. Beam columns and gameplay telegraphs remain active.
- A 2× larger retirement band is used **only** for cosmetic spark/ripple objects, at most every 500 ms. Combat simulation, collision, boss phases, loot and multiplayer synchronization must never depend on rendering visibility.
- Normal-enemy raster buffers release their backing storage after enemies die, with eight retirements per maintenance pass.
- The main static sprite filter cache is LRU and capped by estimated RGBA backing bytes: 64 MiB on mobile, 160 MiB elsewhere. Evicted ImageBitmaps are closed immediately.
- One Web Worker uses OffscreenCanvas to pre-rasterize static filter variants and transfer ImageBitmaps to the renderer, with a bounded one-batch-in-flight pipeline. On unsupported WebViews, asynchronous idle-sliced preparation is used instead. **No live collision or physics simulation is transferred to a worker**, because late replies could corrupt deterministic game state.

## Limits and verification

Rendering is not fully GPU-only: Pixi handles the background with WebGL, while gameplay still uses Canvas 2D. A future foreground GPU batching migration requires dedicated profiling and visual/collision regression tests. The worker offloads independent asset preparation, not all drawing.

Verify on a physical Android device: play from start to a busy wave and a boss; assess p50/p95/p99 frame times, memory use, scene transitions, landscape rotation, coop guest state and large beam telegraphs. Builds alone do not prove device FPS.
