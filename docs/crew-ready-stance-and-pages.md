# Crew gait, ready stances and Pages publishing

Crew steps now use distance travelled. During stance, foot position in world
coordinates stays constant; swing lifts the foot clear, with heel/toe roll,
two-segment knees, slight pelvis motion and opposing arm swing. Patrols accelerate
and decelerate into a brief turn. The pilot uses the same walk cycle and reaches
up while climbing. The marshal runs a shorter clearance path over the full one
second before ignition. Personnel remain intentionally tiny.

Both Gundams hold the supplied crouched ready pose throughout boarding, ignition
and departure inside the carrier. The shared carrier-exit boundary at 8.4 seconds
starts a 0.8-second tuck/pitch transition into flight only after the bay is clear.
They retain one gameplay hull without a second ship. Cockpit and ladder mounts
follow the crouched torso during boarding. Jets use per-pose feet/backpack mounts
and exhaust direction. Reduced motion holds the same crouch until its outside-space
cut. Existing attack timing and launch duration are unchanged.

Burning God Gundam now opens six mechanical fins into a wide radial wing fan,
with three fins on each side of the back hub, instead of parallel trailing blades.
The green chest core and original standard armor colors remain. Reference:
https://www.gundam-base.net/staffblog/67252.html (Core Lander / Hyper Mode photos).

Built-in image generation edited the prior sprites with identity-preserving
prompts. Wing edits required six separate radial fins, fixed body/gesture
registration, unchanged colors/core, alpha margins and no baked effects. Ready
stance atlases used the supplied stance only as a pose reference, then sequenced
ready, crouch, lift and rightward flight. Assets retain native 1536×1024 dimensions:

- `public/assets/ships/sideview/god-gundam-launch-v1.webp`
- `public/assets/ships/sideview/spiegel-launch-v1.webp`
- `public/assets/ships/sideview/god-gundam-burning-flight-v3.webp`
- `public/assets/ships/sideview/god-gundam-burning-actions-v2.webp`

The Pages workflow no longer filters pushes by its own filename. Every push to
`main` builds and publishes the browser game at
https://zukito1411.github.io/space-defenders-impact/ . Manual dispatch remains.
The existing project-path build, SPA fallback, asset verification and deployment
environment are retained.
