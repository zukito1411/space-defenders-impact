# Raid landscape presentation

Landscape mode uses its own compact phone layout under `.raid--landscape`.
Portrait retains its existing styles and rendering branches.

The home screen and shared menus also respond to the device's landscape
orientation through `src/landscape-ui.css`, loaded after the shared materials.
Home uses a fixed two-column composition with a five-button utility rail;
all launch, profile and language controls fit without a scrolling page.
Larger landscape displays use roomier type and buttons. Portrait is unaffected.
Mode selection uses multiple columns. Profile, codex, lobby and settings content
may scroll inside bounded menu panels; leaderboard navigation remains above its
scrolling results and the hangar keeps its model and ship roster visible.

Home now has a Settings control beside language selection. Its display choice
shares the existing `raid-flight-view` preference with Raid, alongside graphics
quality and the saved audio mix. The Android FlightView plugin requests portrait
or landscape on the activity's UI thread; browsers use orientation locking when
available and otherwise retain the manual device-rotation hint. Native code was
reviewed only, without an Android build or device launch.

- One HUD row at phone landscape widths, with a small pause control and a single solo special button. Narrow windows use two rows without overflowing.
- Safe-area spacing, shorter selection cards with side-view previews, and scrollable settings, pause and stage panels.
- Connection status stays below the action; boss bars, warning text and performance text remain upright.
- Side hull rendering is exclusive: the top-view sprite no longer paints over the loaded side sprite.
- God Gundam, Burning God Gundam, Spiegel, Burning Core Lander, both Mesiah liveries and both Raptor escorts have dedicated side artwork. Existing detailed melee frames stay upright in landscape; dash and mirage rendering use the side models.
- Side-engine outlets follow the side profiles. Sunlight rims preserve their silhouettes and are baked once per light direction.
- All eleven player elite side frames use dedicated reinforced armor artwork, including both carrier liveries and both Core Lander forms. Exact elite keys are retained during image lookup and transformation.
- God Gundam's normal and Hyper side models follow the linked official Bandai RG reference, including six energy-generator fins in Hyper mode. Their body framing stays aligned during transformation.
- Landscape Resonance Aura uses the active side hull and blends between forms. Its blur is baked once per sprite and prepared from the selection menu when equipped; gameplay reuses the cached bitmap.
- Burning wakes and engine trails attach to the side model's outlets and extend behind the ship. The Hyper sun halo uses a side-view offset and perspective.

Images were created with built-in imagegen and retain genuine transparency.
Final files are in `public/assets/ships/sideview/`; references, output paths and
the full prompt set are recorded in `raid-sideview-art-v1.json`. All filenames
remain `v1`, and the accepted Space Jet art is preserved.

Assets load through the existing asynchronous sprite cache. The selected ship,
its transformation and relevant escorts begin loading from the menu. Landscape
does not change simulation, collision, projectile counts or graphics settings.

Validation: `tsc --noEmit --incremental false` passed. No game launch,
Playwright, build or runtime FPS/visual verification was performed.
