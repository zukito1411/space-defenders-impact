# Boarding hardware and landscape attacks

The carrier ladder meets the near cockpit lip using a shared mount, hull size and
cover/crop transform. The pilot walks to its foot and climbs the visible rungs.
The cockpit opens during the briefing, stays open until boarding ends at 2.8 s,
closes over 0.65 s, and the ladder retracts from 3.1–3.75 s. Both finish before
ignition at 3.8 s. Jet canopies and Gundam chest hatches have separate mounts and
shapes. The foreground pass draws the pilot and canopy over the single gameplay
hull. Pause retains simulation time; reduced motion uses discrete hardware cuts.

Three registered 2×2 atlases provide wind-up, charge, release and recovery poses
for normal God Gundam, powered-up God Gundam and Spiegel. The native 1536×1024
atlases contain four 768×512 cells, drawn at their original 3:2 aspect ratio.
One cell replaces the hull; poses are never alpha-crossfaded or stretched.
God gathers both palms at his chest and thrusts them forward. Spiegel holds three
kunai in anticipation and opens his hand at release. No projectile/exhaust is baked
into the atlas. Existing live projectiles, thrusters and hitboxes remain separate.

The existing `fireCooldown` and actual fire interval choose the pose: reset to
the full interval is release, followed by recovery, wind-up and charge before the
next shot. This adds no projectile delay or change to damage/cadence. The clock
already pauses and replicates in co-op. Reduced motion keeps the follow-through
pose static. Atlases preload with the selected landscape model and retain a v2
flight-art fallback if loading fails.

Built-in image generation edited each corresponding v2 flight sprite. Prompts
required a 2×2 transparent atlas, identity/armor preservation, fixed torso/head/
legs/backpack registration, articulated arm/hand action only, complete limbs,
and no baked effects or scene. Outputs are versioned siblings in
`public/assets/ships/sideview/*actions-v1.webp`; original flight art is preserved.

- `public/assets/ships/sideview/god-gundam-actions-v1.webp`
- `public/assets/ships/sideview/god-gundam-burning-actions-v1.webp`
- `public/assets/ships/sideview/spiegel-actions-v1.webp`

Regression checks cover boarding safety at 30/60/120 Hz, scaled cockpit mounts,
release-to-shot timing at all current intervals, alpha/dimensions, and one
aspect-preserving atlas draw. Browser captures cover open/closed hardware in
portrait/landscape and actual attack phases on both Gundam models.
