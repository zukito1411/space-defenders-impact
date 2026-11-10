# Gradius Raid combat artwork

The runtime now uses [version 2](raid-combat-artwork-v2.md). The version 1 assets and prompts below are retained as artwork history.

Created and refined with the built-in image generation tool. PNG bytes are copied intact into the project; originals remain in the generator output directory.

## Runtime assets

- `public/assets/raid-fx/combat-atlas-v1.png`: RGBA, 1254 by 1254, four columns by four rows. Plasma, warheads, ion needles, enemy energy, impact corona, sparks, shock front, smoke and molten fragments.
- `public/assets/raid-fx/explosion-atlas-v1.png`: RGBA, 1254 by 1254, sixteen explosion frames in reading order, from ignition through fire to fading smoke.
- Frame rectangles share each atlas source. A small frame inset limits filtering into neighboring cells. NPOT sources keep mipmaps disabled for WebGL 1 compatibility.
- Images were inspected as standalone artwork. No running-game visual or device-performance verification was performed in this change.

## Generation prompts

### Projectile atlas

Use case: stylized-concept. Asset type: production VFX sprite atlas for a detailed space combat shoot-em-up game. Create ONE square 1024x1024 RGBA TRANSPARENT sprite sheet, exactly FOUR columns by FOUR rows, 16 equal square cells, no grid lines. Every effect is isolated and centered at the exact center of its own cell, with at least 18 percent empty transparent padding on all sides of its cell. No effect crosses into neighboring cells. Physically inspired, realistic hand-painted high-end game VFX, intricate luminous plasma filaments, white-hot cores, turbulent gaseous flame, directional streaks, convincing light falloff. Not vector art, not flat symbols, no outlined geometric shapes, no icons or badges. Soft glow fades to true alpha, no opaque background, no checkerboard. All directional projectiles point RIGHT, their tails extend LEFT, their visual center lies exactly at cell center.
Rows and columns, left to right:
Row 1: (1) elongated ice-blue plasma bolt with needle-white core and cyan wake, (2) orange hot rocket exhaust bolt with yellow-white leading tip, (3) slender lime-green ion needle with branching microfilaments, (4) compact violet enemy plasma orb with internal turbulent electric energy.
Row 2: (1) realistic orange fireball impact flash, (2) blue electrical impact corona with branching wisps, (3) fine hot white-orange directional metal spark streak pointing right, (4) smoky turbulent blast shockfront, a soft broad irregular wave fading outward, not a clean drawn circle.
Row 3: (1) small realistic silver armored missile pointing right with red bands and a narrow hot engine trail left, (2) dense blue-white charged plasma orb, (3) organic magenta alien ink globule with fluid tail pointing right, (4) wispy charcoal smoke puff with visible gray ash lit softly from within.
Row 4: (1) cyan engine exhaust plume, narrow at its RIGHT root and fanning gently to the LEFT, (2) irregular glowing molten metal debris fragment, (3) translucent green poisonous vapor cloud with volumetric rolling billows, (4) short white-hot weapon muzzle flash with orange wisps.
No text, letters, numbers, labels, borders or interface. Consistent professional game VFX art direction. Exactly 16 individually isolated sprites in a regular 4 by 4 grid. Full canvas is transparent between sprites.

### Explosion atlas

Use case: stylized-concept. Asset type: production explosion animation sprite sheet for a detailed space combat shoot-em-up game. Create ONE square 1024x1024 RGBA TRANSPARENT sprite sheet, exactly FOUR columns by FOUR rows, 16 sequential animation frames in reading order: row 1 left to right is frames 1-4, row 2 frames 5-8, row 3 frames 9-12, row 4 frames 13-16. 16 equal square cells; exactly ONE centered explosion frame per cell. No grid lines, no extra objects. The same orange thermobaric space explosion evolves continuously with realistic turbulent flame, fine incandescent ejecta, layered dark smoke, white-hot cores, and physically convincing falloff. Frame 1 is a tiny white-hot ignition at center; 2-4 rapidly bloom to bright compact orange/yellow flame; 5-8 show an expanding turbulent orange fireball with a bright hot core and fine sparks; 9-12 become rolling embers and dark gray smoke; 13-16 dissolve into progressively fainter thin smoke with the last frame almost fully transparent. Lock the center and overall spatial scale across ALL cells: early frames grow into the same fixed maximum extent, and late smoke slowly diffuses without jumping. Every frame fits fully inside the inner 70 percent of its cell, leaving at least 15 percent truly transparent padding on every cell edge, including the largest frame. No neighboring overlap. Realistic detailed painted game VFX, NOT cartoon, NOT pixel art, NOT icon, no clean geometric circles, no badges, no text, labels, numbers, border, background or checkerboard. Soft edges fade to true alpha. Entire sprite sheet between the effects is transparent. Professional usable animation atlas, no perspective ground plane, straight-on expanding explosion.

## Final refinement prompts

### Projectile atlas

Edit target: the supplied projectile sprite atlas. Keep the exact 16 subjects, their order, colors, realistic detail, and RIGHT-facing orientation. Fix only asset layout and transparency: exactly 4 by 4 equal square cells, each sprite centered at the exact cell center, each entire effect INCLUDING its faint halo shrunk to fit inside the central 60 percent of its cell. Leave a minimum 20 percent TRANSPARENT gutter at all four sides of every cell. No effect or halo may touch a cell boundary. Remove all white/gray fringe, ghosted edges, colored matting or neighboring overlap. Empty areas are genuine alpha transparency, NOT black or white pixels and NOT a checkerboard. NO labels or grid lines. Preserve the art's luminous filaments, physical materials, gradients, detailed smoke and soft alpha falloff. Output one square transparent atlas.

### Explosion atlas

Edit target: the supplied explosion animation atlas. Keep the SAME orange thermobaric explosion evolution across 16 frames, ignition then fire then smoke then fading away, reading order left to right top to bottom. Fix the very important production problems: REMOVE all milky white backdrop and huge bright halos between frames. Surroundings must be actual alpha transparency. Output precisely 4 columns by 4 rows of equal square cells. Lock every explosion center at its exact cell center. SHRINK the effects so the largest flame, smoke and even its faintest glow fit inside the central 60 percent of EACH cell. Leave 20 percent transparent gutter on every cell edge. No smoke or glow crosses a cell boundary. Late smoke should be CHARCOAL GRAY with translucent soft edges, NOT white opaque patches, and frame 16 should be almost completely transparent. Preserve fine physically realistic orange flame and fine flying embers. No labels, grid lines, black matte, white matte, checkerboard, borders or interface. One square RGBA transparent game sprite atlas.

