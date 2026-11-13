# Carrier departure

A ship-free carrier environment replaces the old hangar photograph during preflight.
Landscape uses an orthographic side cutaway and a right-hand aperture. Portrait
uses a vertical launch chamber with a top aperture. Both plates use `cover`, never
stretch, and the normal ship renderer supplies the selected hull, cosmetic frame,
orientation and correctly mounted engines.

## Sequence

1. Three command transmissions establish the mission, objectives and clearance.
   Campaign, Endless and Boss Rush have separate scripts in English, Chinese,
   Japanese and Korean. The actual selected pilot is held in a service cradle,
   with no thrust or combat shields. Text reveals progressively; continue reveals
   the rest or advances, and launch now skips the dialogue but retains ignition.
2. The host starts a 10.2 second simulation clock. The first 2.8 seconds board the pilot, the next second clears the marshal, and the next 1.6 seconds warm the
   engines and retract the four service contacts. Position remains fixed.
3. The actual pilot accelerates while the opaque hangar moves behind the camera.
   There is no crossfade of planets through walls and no duplicate ship sprite.
4. The carrier clears at 8.4 seconds. Camera framing settles into the normal
   playable position and normal ship size at 10.2 seconds. Spawn/fire/input remain
   locked until that moment; scouts join afterward.

Pause freezes the departure. Co-op sync sends carrierLaunch and stageEntry so a
joining guest uses the host clock. Restart and checkpoint requests retain the
requested mode/stage through the transmission. Reduced motion shows complete
text, waits for authorization and cuts between stable carrier/space views.

## Artwork

Generated with built-in image generation. Both prompts required a ship-free
industrial carrier interior with graphite-blue ribbed bulkheads, maintenance
decks, ventilation fans, cyan lamps and amber service lights. Landscape requested
an empty berth and unobstructed right exit; portrait requested a vertical empty
runway and top exit. No ships, people, text, UI or logos are baked in. Original
rasters were encoded to WebP without changing dimensions.

- public/assets/carrier/carrier-bay-landscape-v1.webp — 1672 × 941
- public/assets/carrier/carrier-bay-portrait-v1.webp — 1024 × 1536

## Verification

The pure sampler is checked at 30/60/120 Hz for bounded positions, continuous
motion, stationary ignition, monotonic release and exact combat handoff. Browser
CI captures dock, ignition, departure and combat on portrait, landscape, compact
portrait/landscape and reduced-motion screens. It checks visible canvas output,
three objectives, no mission/comms overlap or page scrolling, and pause/resume.
Existing hitbox, thruster, multiplayer input, combat and boss tests remain in CI.
Physical Android speaker balance and frame pacing require on-device review.
