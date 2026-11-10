# Modern raid VFX, version 2

Two generated RGBA atlases replace the version 1 runtime sources using the existing `combatArt.ts` loader and tile order. The earlier images remain available for comparison. No new emitters, sprite counts, simulation work, render passes, shadows, filters or gameplay objects are introduced.

## Texture budget

Each source is 1024 by 1024, with sixteen 256 by 256 cells. Each cell's complete original canvas is scaled to 192 by 192 and centered, providing a guaranteed 32px transparent gutter on every edge. Explosion frames share this single scale: tiny ignition frames and late smoke are never individually enlarged. Fractional source-cell boundaries are rounded consistently.

Base RGBA storage is 8 MiB for both sources versus approximately 12 MiB for the two 1254px version 1 sources. The existing loader enables mipmaps for power-of-two sources; a complete mip chain brings version 2 to approximately 10.67 MiB combined. This is a theoretical texture-storage budget, not a measured process-memory or FPS result. Sprite dimensions and existing culling, pooling and quality limits are unchanged. Static projectiles animate through existing transforms; explosions select an existing lifetime frame without creating an animation timer.

## Combat tile order

| Tile | Texture | Existing uses |
| --- | --- | --- |
| 0 | Cyan plasma | Player pulse, laser, needle; enemy blade |
| 1 | Hot orange bolt | Player spread; boss scatter |
| 2 | Lime ion needle | Player scatter; enemy needle |
| 3 | Violet alien orb | Enemy, boss, plasma, orb and void shots |
| 4 | Fire impact | Super shot |
| 5 | Cyan ion impact | GPU impact corona |
| 6 | Spark streak | GPU sparks |
| 7 | Amber shock arc | GPU ripples |
| 8 | Armored missile | Player rocket and homing |
| 9 | Blue charge core | Available for later use; no new emitter |
| 10 | Magenta ink | GPU squid ink |
| 11 | Charcoal smoke | Available for later use; no new emitter |
| 12 | Cyan exhaust | Available for later use; no new emitter |
| 13 | Molten fragment | GPU debris sparks |
| 14 | Green venom | GPU poison cloud and venom spit |
| 15 | Amber muzzle flash | Existing brief player-shot muzzle |

The explosion sheet contains sixteen consecutive frames in reading order. Canvas fallback and GPU foreground share common projectile/explosion sources; existing GPU-only accents remain GPU-only. Beam weapons and special procedural projectiles keep their established visuals.

## Reproduction and validation

Generated with the built-in image tool, then normalized with Pillow using `scripts/prepare-raid-fx.py COMBAT_SOURCE EXPLOSION_SOURCE`. The source images are never overwritten. The script checks RGBA dimensions, all transparent cell gutters, sixteen nonempty cells, and a final explosion frame with less than five percent of frame 6's integrated alpha. `raid-fx-v2-manifest.json` records source and production hashes, exact sizes and per-frame alpha coverage. Run `python scripts/prepare-raid-fx.py --check` to verify shipped assets without the original generation files.

Automated asset checks and a production build verify packaging. A headless Chromium game smoke test was attempted but the environment denied Chromium's required socket creation before page load, so in-game visual checks remain pending. Device FPS under heavy boss fights remains an on-device validation item; smaller sheets and unchanged draw counts do not establish a frame-rate guarantee.

## Combat generation prompt

Use case: stylized-concept.
Asset type: production 2D space shooter combat VFX ATLAS, not a showcase poster.
Create ONE square transparent RGBA sprite atlas precisely FOUR columns and FOUR rows, 16 evenly spaced equal square cells, absolutely NO lines or text. ONE distinct isolated sprite centered in each cell. Each effect INCLUDING glow must stay inside central 60% of its cell, with 20% genuinely transparent gutters around ALL cell edges. Absolutely no overlap.
Art direction: modern high-end hand-painted sci-fi VFX, beautiful crisp white-hot cores, saturated colored edges, intricate narrow electric filaments, tiny restrained sparks, compact alpha falloff; optimized for readability when rendered only 30-70 pixels wide. No foggy enormous halos, no milky gray fringe, no background. This is for detailed metallic warships, alien creatures and golden mechanical bosses.
Exact reading order left to right, top to bottom:
row 1: cyan plasma spear pointing RIGHT with tail LEFT; orange-red hot plasma bolt pointing RIGHT; lime ion needle pointing RIGHT; round violet alien energy orb with fierce bright center.
row 2: compact orange-white fiery impact burst centered; compact electric cyan impact burst centered; narrow orange spark streak pointing RIGHT; amber shockwave arc centered, curved crescent, transparent center.
row 3: metallic silver red-banded missile pointing RIGHT with short orange exhaust LEFT, sharp mechanical fins; round blue electric charge core; magenta alien ink comet pointing RIGHT with tail LEFT; small charcoal translucent smoke puff with tiny embers.
row 4: cyan engine exhaust plume pointing RIGHT with tail LEFT; small irregular molten metal fragment with orange fissures; compact lime-green venom burst; small amber-white muzzle flash pointing RIGHT with tail LEFT.
All directional subjects face RIGHT. Matching visual weight, fixed centers, symmetric cell spacing. No lighting of empty space. Preserve true transparency especially around smoke and energy. No gray or white matte, no checkerboard, no labels, no panel frames, no HUD, no scenery. Usable game textures, visually striking but tightly bounded.

## Explosion generation prompt

Use case: stylized-concept. Asset type: production 2D explosion sprite animation for a modern detailed space combat shooter.
Generate ONE square RGBA transparent atlas, exactly 4 columns by 4 rows of equal square cells; exactly sixteen consecutive animation frames in reading order left to right top to bottom, no grid lines and no text. This is ONE explosion changing over time, NOT sixteen unrelated explosions. Same center and same absolute spatial scale in every cell. Frame 1 tiny white-orange ignition. Frames 2-4 grow rapidly into a compact brilliant orange fiery bloom. Frames 5-8 maximum turbulent orange fireball, intricate hot flame petals, white-yellow center, sharp fine ember filaments. Frames 9-12 cool into smaller orange burning pockets in soft charcoal smoke. Frames 13-16 dissipate into very faint wisps, frame 16 nearly invisible. Continuous coherent evolution, fixed center, no ground, no perspective, no camera motion.
Every frame including embers and faint smoke must fit within the central 60 percent of its cell. At least 20 percent totally transparent gutter on every edge. Biggest fireball is centered and fully contained. REAL transparent background, no white glow matte, no checkerboard, no backdrop, no milky halo. High-end hand-painted realistic VFX matching detailed metallic warships. Charcoal translucent smoke, never gray-white opaque patches. Crisp energetic detail that reads at 40-120px, saturated warm fire, tight bloom, no giant rays. No rings, no typography, no labels, no icons, no scenery, no overlapping cells.

