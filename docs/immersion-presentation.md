# Immersion presentation pass

This pass implements the eight audio and feedback additions across Air Raid,
the carrier and Ship Defense. Combat damage, collision geometry, prices,
upgrades, enemy health and wave rules retain their existing values.

## What changes in play

1. **Protection contacts:** field, shield and combined protection have separate
   recorded hits and breaks. A white contact arc travels along the actual hull
   outline; breaks eject short cyan, gold or violet shards. Projectile contacts
   are captured before spent shots are moved offscreen. Field ramming also
   triggers these reactions. Hit animation freezes while paused.
2. **Engine character:** nine edited recording loops distinguish the fleet.
   Throttle changes gain and pitch smoothly, an elite harmonic adds a quiet
   upper layer, and critical hulls develop intermittent faults. Co-op engines
   have separate positions and levels.
3. **Sector beds:** stellar, asteroid, wreck, ion, ocean, volcanic and station
   ambience add restrained environmental detail. Occasional radio fragments
   and hull ticks leave space between events; boss encounters reduce the bed.
4. **Adaptive score:** eight percussion stems come from the exact existing
   scores, preserving their musical phrases. Enemy density, hostile shots and
   boss damage raise the layer; clearing a stage or returning to the carrier
   removes it. The streamed layer follows the original transport, corrects
   drift beyond 45 ms and respects the music bus.
5. **Destruction:** fighters have a short flash and snap; armored hulls have
   delayed secondary fire and metal fragments. Capital ships retain the
   existing staged boss breakup and add debris, a delayed pressure wave and
   a longer layered blast. Low quality reduces fragment count. Reduced motion
   suppresses moving debris and the pressure wave.
6. **Carrier life:** quiet maintenance tools and cargo movement alternate
   while docked. Two original English PA announcements are spaced at least
   40 seconds apart and stop before departure. Other languages retain the
   nonverbal foley. Existing launch and dialogue audio continue to lead.
7. **Hull condition:** critical hulls emit two cached smoke wisps and brief
   aft electrical faults. Successful repair pickups scan green-white seams
   clipped to the current ship artwork. Reduced motion uses a static repair
   response and suppresses smoke motion.
8. **Ship Defense:** placement closes metallic corner clamps with a deployment
   sample. Newly activated synergies get one audio cue and localized feedback.
   Enemies near the final quarter of a route trigger a restrained amber HQ
   pulse; hull below 30% turns it red and increases warning cadence. Enemy
   deaths use the same tiered recording library.

## Files and asset provenance

- `src/components/games/presentationAssets.ts`: clip and score mapping.
- `src/components/games/presentationAudio.ts`: decoded sample mixer and streamed
  adaptive score transport.
- `src/components/games/raid/scenePresentation.ts`: event director, ambience,
  engine response and destruction timelines.
- `src/components/games/raid/playerCondition.ts`: contact, repair and damage
  overlays; `shipProtection.ts` caches the hull-clipped repair texture.
- `raid/GradiusRaidRuntime.tsx`, `raid/playerRender.ts`, `raid/types.ts`: combat,
  player drawing and optional host snapshot integration.
- `raid/carrierAudio.ts`, `src/App.tsx`: carrier foley and announcement lifecycle.
- `towerDefense/presentation.ts`, `towerDefense/presentation.css`,
  `SpaceImpactDefense.tsx`: defense sound and visual feedback.
- `sound.ts`: shared settings-change notification and current BGM transport.
- `raid/preload.ts`: offline clip URLs and persistent cache revision.
- `public/audio/immersion/`: 44 Ogg files and `manifest.json`, about 5.6 MB total.
  `scripts/produce-immersion-audio.py` records the reproducible editing recipes.
- `public/audio/ATTRIBUTION.txt`: inherited source credits and original PA text.
- `scripts/verify-ui-artwork.mjs`: all new recordings checked in production output.
- `scripts/test-immersion-presentation.mjs`,
  `scripts/test-space-jet-force-field.mjs`, `.github/workflows/verify.yml`:
  asset integrity, presentation lifecycle and hull rendering checks.

Effects are offline edits of the bundled CC0 mechanical, engine, radio and boss
recordings. Music stems retain their source licenses and attribution. PA dialogue
uses a local Windows Zira voice recording with filtering and short reverb.
No paid provider or downloaded recording was used for this pass.

## Budgets and lifecycle

The sample mixer shares decoded recordings across scenes with a 16 MiB cache
budget. It permits at most 12 simultaneous one-shots and allows important cues
to preempt less important ones. Individual clips have cooldowns. Raid uses at
most four continuous sample loops: two pilots, the elite harmonic and one
regional bed. Percussion streams through one HTML audio element rather than
decoding an entire score into the effect cache.

Mute, settings and hidden-tab changes silence active sample gains immediately.
Scene teardown cancels pending decodes/play requests and stops crossfading loop
sources too. Paused scenes stop their audio layers. Returning to an active scene
fades the loops back in. Existing bus controls remain authoritative.

Destruction history is bounded to 12 snapshot events and 24 live visual events.
Guests deduplicate event serials; protection events travel with player snapshots.
These optional cosmetic fields do not participate in simulation decisions.
Actual two-device network playback remains a separate device check.

Protection geometry and four 256x256 textures are cached for at most 24 hull/pose
profiles (24 MiB of RGBA texture pixels at that maximum). Flight draws cached
images and short contour paths; it does not read ship pixels or allocate new
particle arrays for these effects.

## Verification

- TypeScript and the production build, including bundled asset verification.
- 33 source test scripts using LF-normalized source reads for older
  Windows-sensitive extraction tests. The new immersion and hull tests also run
  directly without normalization.
- All 44 Ogg files decoded locally: peak headroom, DC bias and duration checked;
  all 16 effect-loop seams and eight score/source lengths checked.
- Real Chromium audio: two decoded sample loops, running audio context,
  score/source drift below 80 ms, immediate mute and teardown.
- Browser production-renderer capture: eight contact/repair/damage states and
  three destruction timelines. Live elite Space Jet carrier launch and flight
  at 844x390; Ship Defense placement and first wave at desktop sizes. A local,
  test-only seeded session also verifies Gatling/Laser synergy activation during
  setup, deployment clamps and the critical HQ pulse.
- Android asset-packaging regression test. No physical Android performance,
  device speaker mix or two-device multiplayer listening test was performed.

Local review artifacts are under `tmp/playtest/` and `tmp/audio-production/`:
the contact/destruction sheet, live game captures, encoded-audio validation
report and a 24-second audio review reel mixed at runtime gains. They are ignored
review files, not shipped assets.
