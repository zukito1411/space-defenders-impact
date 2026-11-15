# Full HD scenery pass

The existing Max graphics setting now preserves a DPR cap of 2 in both solo and co-op. At a 1920 x 1080 viewport with DPR 1, output is native Full HD; DPR 2 permits 3840 x 2160 pixels. Smaller displays retain their native dimensions. Lower quality profiles retain their previous caps.

## Artwork

Four new lossless 2048 x 2048 RGBA atlases remaster the existing planet, destination, landmark, wreck and station artwork. Individual body frames increase from 464 to 928 pixels; destination surface fallback frames increase from 504 to 1008 pixels. The earlier nebula remaster remains in use. Lighting and bloom crops scale with the atlas gutters, including fallback to the original 1024-pixel atlases when a remaster is unavailable.

`scripts/assets/remaster-scenery.py` reproduces the four atlases using isolated-cell Lanczos resizing and restrained RGB sharpening. Alpha remains the resampled original silhouette. `scenery-remaster-manifest.json` records source/output hashes. No new image generation, scenery composition, geometry, weather or animation was introduced in this pass. The subsequent galaxy correction sets the nebula to 30% opacity behind both the restored original distant galaxies and solid scenery.

Legacy planet and station loading now permits up to 1536 pixels instead of reducing larger sources to 620-900 pixels. The 1400-pixel planet retains its original resolution. Smaller originals are retained at their native size, rather than enlarged during loading; for example, the small distant moon remains approximately 376 pixels after transparent trimming. These are remasters of existing pixels, not newly recovered native detail. Extreme orbital close-ups can still exceed their source resolution.

## Cost

The three cosmos atlases now occupy 48 MiB of nominal RGBA GPU pixels, or approximately 52.17 MiB including existing bloom and terrain textures. Relative to the previous pass with only the nebula at 2K, the two additional cosmos remasters add 24 MiB. The two wreck atlases add another 24 MiB, for 48 MiB additional nominal GPU texture storage in total. Larger retained legacy planets and decoded browser/Canvas images add further memory. Download sizes are not decoded memory sizes.

The sprite pools, draw counts and per-frame algorithms remain unchanged. Filtering happens offline or during existing lighting warmup. Co-op Max can submit more pixels on high-DPR displays. Physical Android memory, sustained FPS and device frame times have not been profiled.

## Verification

- All 36 source regression scripts passed, including `test-ultra-scenery.mjs`, plus the updated original-art fallback cases in the cosmos and wreck tests.
- A real Pixi/Chromium fixture rendered Pelagic, Cinder, ocean approach, volcanic approach and fleet scenery at a 1920 x 1080 displayed viewport with no page errors. The landscape game canvas uses 1080 x 1920 pixels rotated into the display. Both main approach planets use 928-pixel frames in a 2048-pixel shared texture; all four new atlases loaded successfully. These are presentation fixtures, not gameplay or FPS benchmarks.
- Full HD screenshots are retained under `tmp/playtest/ultra-fhd-*.png` for local review.
- Production build, artwork verification and PWA HTML/manifest/worker checks passed. Chromium activated the production worker, verified 338 unique cached URLs and opened the menu offline. Android asset-packaging checks passed with all 316 production media files and retained APK metadata; this is not an APK compilation or device test.
