# Build checks and packaging correction

Inspected GitHub runs for commit `8ca3a75ccc06cabc502eca0259bdaa3e2e568d67`:

- [Verify web build](https://github.com/zukito1411/space-defenders-impact/actions/runs/43672640322): completed successfully, including the presentation browser job.
- [GitHub Pages deployment](https://github.com/zukito1411/space-defenders-impact/actions/runs/43672640296): completed successfully.
- [Signed Android APK Release](https://github.com/zukito1411/space-defenders-impact/actions/runs/43672640431): failed during media packaging, before Capacitor sync, signing-key restoration or Gradle compilation.

The exact failure was `ValueError: Unrecognized Android media: audio/immersion/manifest.json`.
The packaging script accepted binary images/audio and skipped text credits, but
rejected the new JSON audio manifest. It now retains JSON metadata alongside text
credits in the APK, and extracts only binary media into immutable download packs.
Unknown non-media extensions still fail validation.

`scripts/test-android-asset-packaging.py` covers metadata retention, hash-based
deduplication and stable packs. Its `--built-assets` mode also copies and packages
the actual production output in a temporary directory. This passed with 310
media files, 182 packs and all 44 immersion clips; the manifest remained in the
APK payload. The main web verification job now runs this production packaging
check so a metadata addition is caught before a release workflow.

The reported PWA warning was reproduced by local preview HTML fragments lacking
explicit document tags. The application `index.html` and committed presentation
fixture already had complete head/body tags, and GitHub's production web-build
log did not contain that warning. The local preview documents have been completed.
`scripts/verify-pwa-build.mjs` now runs in every production build and checks the
source document tags, injected manifest link, icon files, populated service worker
and registration code. Local production builds pass with zero PWA warnings.
The Chromium offline check installs all 332 unique production cache URLs, waits
for activation, disables the network and opens the actual game menu. This passed
locally and is now part of the presentation browser job. It counts unique URLs
because Workbox lists the included icon files in both its glob and includeAssets.

These are local source fixes. No commit, push, workflow rerun, APK publication or
change to the signing identity was performed. A new GitHub run after pushing the
changes is still required to confirm the complete signed Android release path.
