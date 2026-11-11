# Command boss profiles and balance

The twelve ordinary campaign bosses (1–4, 6–9, 11–14) now use individual encounter
sequences rather than the generic fire callback. Existing special Squid, Snake,
Final/Devil encounters and Boss Rush selection retain their own mechanics. Endless
uses the selected command hull's encounter profile, including the supreme-carrier
profile for Super.

## Findings in the previous balance logic

- Normal bosses stopped firing whenever `performance.now()/1000 % 6 > 3`: half
  the fight was a shared wall-clock pause, unrelated to their individual attacks.
- An expired fire cooldown reset even if that pause prevented firing. This could
  skip an additional volley at either end of the pause.
- Difficulty scaled HP and damage but gave these bosses no different tactical
  timing. Later hulls reused their attack class's single repeating pattern.
- Boss HP included stage, wave and weapon-stack count, but no rank term. Player
  base attack is `1 + (rank - 1) * 0.65`, before ship/weapon bonuses; `getPowerScore`
  counts only weapon stacks. High-rank builds therefore outgrew that HP adjustment.
- A normal nuke can remove 16–38% max HP (or its damage floor), and special ship
  abilities add substantial burst. Those rewards are preserved; no damage caps or
  mandatory invulnerability phases were added.

## New identities

| Stage | Ship | Sequence and movement |
| --- | --- | --- |
| 1 | Crimson Bastion | Fan / aimed needles; broadside repositioning |
| 2 | Amethyst Orrery | Iris / needles / iris; orbital repositioning |
| 3 | Verdant Reaper | Pincer / needles / pincer; alternating flanks |
| 4 | Tidal Razor | Three-blade sweep / needles / fan; opposite-side sweeps |
| 6 | Cinder Gate | Gapped curtain / locked beam / curtain; fortress shifts |
| 7 | Ashen Ark | Fan / curtain / needles / fan; broader side changes |
| 8 | Prism Sovereign | Reverse iris / curtain / iris; orbital repositioning |
| 9 | Scythe Regent | Pincer / blade sweep / needles / pincer; flank chains |
| 11 | Triarch Hydra | Left/right/void-head salvos / pincer / heads / needles; hunts last bait |
| 12 | Null Cathedral | Twin beams / curtain / single beam / curtain; fortress shifts |
| 13 | Eclipse Dreadnought | Fan plus side orbs / curtain / fan / needles; heavy broadsides |
| 14 | Eventide Nexus | Iris / reverse iris / curtain / fork; alternating sector pressure |

Phases latch at the start of an attack: full strength, <=65% HP, and <=30% HP.
Later phases add follow-up bursts where appropriate, raise speed and shorten
recovery. Every sequence still has recovery. Hulls commit their origin and aim
while warning/firing, then reposition at bounded speed (<=31 logical units/sec
horizontally, <=8 vertically). They stay in the upper field. This creates deliberate
attack and punish windows rather than relentless tracking.

Warnings are at least 0.78 seconds for projectile attacks and 1.05 seconds for
beams, even on Expert/low HP. Easy lengthens warnings and slows shots; Hard/Expert
modestly shorten recovery and increase speed. Existing difficulty damage, HP and
one-hull rules remain. A phase change cannot retarget or shorten a warning already
in progress. Co-op alternates the bait pilot between attacks.

Curtains preserve a 26–30-unit-wide gap between projectile centers, with a smaller
cyan corridor accounting for player/projectile collision radii. Twin beam centers
stay 28 units apart. Beam warning strips include the actual beam collision range
plus player radius. These are per-volley guarantees; overlapping old shots still
require player judgment. Non-beam follow-ups make small, predictable angle shifts.
Hydra previews all three committed head lanes before releasing them in sequence.

A nuke clears existing shots and cancels a pending command attack into 0.9 seconds
of recovery. The next attack must show a fresh warning; there is no instant
retaliation.

## HP tuning

At spawn, the game multiplies the existing boss HP formula by the hull's HP
factor (1.08–1.18) and a rank factor. Let `levels` be the pilot's rank minus
one. Co-op uses the mean of the two pilot ranks. Each rank is bounded by the
game's player rank range before averaging.

`rank factor = 1 + .06 * levels + .002 * levels * levels`

Easy halves the added rank pressure. At ranks 1, 10, and 20, the Normal rank
factors are 1.000, 1.702, and 2.862. With the same loadout, a rank 10 boss has
about 49% more HP than in the previous build, and a rank 20 boss has about 2.2
times its previous HP. The maximum HP is fixed for the encounter.

## Deterministic simulation audit

The following are 60-second synthetic encounters with HP held at 100%, 55% or 20%,
a stationary target at (50,82), Normal difficulty, 60 Hz, and no player damage.
The legacy count reproduces the previous cooldown/pause logic at wave=stage and
wall-clock phase zero. Counts are volleys, not individual bullets or kill times.

| Stage | Legacy volleys | New volleys: full / 55% / 20% HP | Peak live shots | HP factor: rank 1 / 20 |
| --- | --- | --- | --- | --- |
| 1 | 16 | 29 / 54 / 58 | 16 | 1.08 / 3.091 |
| 2 | 16 | 29 / 54 / 58 | 31 | 1.08 / 3.091 |
| 3 | 17 | 30 / 55 / 60 | 14 | 1.10 / 3.148 |
| 4 | 20 | 30 / 56 / 60 | 14 | 1.10 / 3.148 |
| 6 | 21 | 27 / 45 / 48 | 28 | 1.12 / 3.205 |
| 7 | 20 | 31 / 57 / 62 | 24 | 1.12 / 3.205 |
| 8 | 23 | 52 / 72 / 78 | 46 | 1.14 / 3.263 |
| 9 | 22 | 54 / 75 / 80 | 16 | 1.14 / 3.263 |
| 11 | 28 | 62 / 73 / 78 | 12 | 1.16 / 3.320 |
| 12 | 29 | 39 / 52 / 56 | 23 | 1.16 / 3.320 |
| 13 | 30 | 52 / 73 / 78 | 34 | 1.18 / 3.377 |
| 14 | 31 | 51 / 72 / 76 | 48 | 1.18 / 3.377 |

The complete diagnostics are in `command-boss-simulation.json`, generated with:

`node scripts/test-command-bosses.mjs --report docs/command-boss-simulation.json`

Across the scripted difficulty/HP/refresh-rate cases and a ten-minute late-boss run,
the observed peak was 48 live shots. The generic scheduler refuses an entire
volley if it would exceed 120 enemy shots, leaving room below the co-op packet's
140-shot cap. It resumes only with a new warning. This rule is independent of
visual quality; lower graphics settings do not remove hazards or warnings.

Every burst has at most 12 projectiles. Recipes reuse two small scratch arrays
(simulation and rendering); projectiles use the already-cached materials. Warnings
need at most twelve simple trajectory strokes in one Canvas path, or two beam
strips. Charge rings, muzzle flashes, and phase shockwaves follow the encounter
clock and use short-lived Canvas strokes with the same scratch recipe. The
reduced-motion preference limits expansion. The hull name and the 65% and 30%
phase markers appear on its health bar. A stable emit callback avoids a new
callback per simulation tick.

## Verification and limits

Tests execute the scheduler at 30/60/144 Hz, all profiles/phases/difficulties, entry
protection, movement and speed caps, locked targets, HP changes mid-warning,
atomic budget skips, co-op target alternation, real network warning interpolation,
real nuke callback, portrait/landscape warning geometry and full pattern coverage.
Renderer assertions cover the phase pulse, charge ring, muzzle origin and expiry,
and health bar thresholds.
The almanac tests exercise actual entry construction/unlock gates and all four
languages; cards include each hull's tactics, and a shared guide explains phases,
colors and nuke interrupts. Existing regression scripts and production packaging
checks also run.

Stationary and continuous-strafe bot hit counts are diagnostic, not a human
playtest: blindly strafing is worse for some iris patterns. The tests demonstrate
bounded, reproducible mechanics; they do not prove every combination is avoidable
or establish browser/Android FPS. On-device difficulty and performance still need
playtesting, especially with endgame unlocked ship kits.
