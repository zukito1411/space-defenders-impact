# Presentation acceptance criteria

The seven presentation areas share the current game assets and the same logical
flight coordinates. A change is not considered visually approved just because
TypeScript or the APK build succeeds. Browser captures cover portrait and
landscape, while physical Android performance and speaker/headphone mixing need
on-device review.

| Area | Implemented behavior | Checks |
| --- | --- | --- |
| Combat | Four ignition materials with short distinct lifetimes; flashes follow the firing pilot. Colored impact sparks, target contact flashes, piercing and missile trails retain the original physics. | Actual callback ownership, volley limits, muzzle and hitbox regression tests. |
| Bosses | Protected entry, named campaign warnings, attack telegraphs, three combat phases, critical damage smoke, staged destruction and heavy-hit recoil. | Production scheduler, damage and drawing tests across viewport shapes. |
| Environment | Existing depth/parallax, moons, clouds, planets and capital flybys; small ship exchanges with projectiles and an explosion. Background exchanges stop during bosses and surface encounters. | Timed event boundaries and browser captures; low graphics and reduced motion omit optional activity. |
| Enemies | Formation approach, scout/sensor maneuvers, steady heavy hulls, and a single committed ram/interceptor lane. Rams slow down with a charge cue, then accelerate without retargeting the dodging pilot. | Formation tests, committed-target and speed/charge checks. |
| Player movement | Responsive movement, frame-rate-independent bank, nozzle-mounted thrust and reversal jets. Launch moves the same gameplay ship from a visible launch position into its playable position; later stage approaches enter from offscreen. | 30/60/120Hz entry tests; bank and thruster regressions. |
| Audio | Existing individual weapon sounds, heavy firing weight, shield resonance, one low-hull alert, launch cue, near misses and boss stingers. Stereo follows the actual screen axis in both orientations. Ordinary pickups no longer duck music repeatedly. | Mixer/mute/mono/stereo tests; physical listening still required. |
| Menus/HUD | Responsive home/menu controls, named boss warnings, rank feedback and hangar choice carried into the raid. Launch backdrop is behind the one real ship. Pausing freezes simulation entry; no decorative second ship or timer. | Browser launch and flight screenshots/videos; no duplicate overlay ship; no horizontal page overflow. |

The browser fixture is under scripts and is not an entry point in the production
build. CI uploads the captures as presentation-review. Do not add duplicated ship
sprites, permanent opaque effect layers or arbitrary per-frame particles to make
screenshots look busy.
