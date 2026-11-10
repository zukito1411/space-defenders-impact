# Gradius Raid hybrid foreground renderer

One Pixi/WebGL application draws scenery and the foreground. A transparent Canvas overlay keeps the existing player presentation, animated bosses, scripted attacks and warning telegraphs.

## Atlas-based effects

`combatArt.ts` loads two shared RGBA sources and derives frame textures without duplicating image backing storage. The projectile sheet provides plasma filaments, metal warheads, ion needles, enemy energy, ink, poison vapor, sparks, shock fronts and impact coronas. The explosion sheet provides sixteen frames from ignition through fire and smoke. See [artwork and prompts](raid-combat-artwork.md).

Generated materials replace repeated per-projectile Canvas gradients for common weapons. Beams with gameplay-specific geometry, Core Lander attacks, Spiegel attacks and the animated boss bodies keep their original presentation paths. Boss beam dimensions and warning placement are unchanged.

Each live projectile owns a reused sprite keyed by its numeric ID and source namespace. Additive energy and normally blended missile/vapor art are grouped separately. Short local muzzle flashes use the particle reserve; delayed remote snapshots do not generate mid-flight muzzle flashes.

Impact visuals derive from existing ripple ages and colors. Warm large impacts animate fire and smoke; energy impacts use a corona. Existing rings and spark counts remain. The effect renderer does not add collision objects, change damage, or expand multiplayer messages.

## Preparation and lifetime

The asset preloader decodes both atlases. The foreground creates warm sprite reserves, bakes the normal-alien variants and fallback boss projectile textures, then uploads textures through `renderer.prepare.upload`. Local launch waits for that preparation. Texture preparation stays outside live attack bursts.

Atlas frames share globally cached sources, so destroying a raid scene does not destroy those shared images. Scene-owned fallback rasters and sprite nodes are released by foreground teardown. Texture-cache maintenance reuses a scratch set and runs at most once per second when needed.

A failed atlas load preserves the original art path. Failed GPU foreground initialization/rendering leaves the Canvas path available. This fallback retains the original appearance; it is not a measured performance guarantee.

## Presentation cadence

Every visible animation-frame callback presents the scene. There is no automatic 60/30 FPS scheduler or adaptive resolution reduction. Quality follows the player's explicit selection. Background geometry keeps its existing cache cadence while world and combat sprites move each frame.

The optional performance HUD includes callback-interval percentiles and asynchronous GPU timing. TypeScript checks establish compilation only. Visual equivalence, effect readability, device FPS, memory and thermal behavior require a later runtime comparison.
