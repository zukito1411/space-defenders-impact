# Hull-fitted force fields and shields

All player ships now use one protection renderer with three distinct states:

- Force field: cyan/emerald hex glass and a segmented energy rim.
- Shield: gold-white triangular armor plates around the hull.
- Combined: an integrated violet/cyan shell with inner gold armor and connecting
  energy bridges, rather than two overlapping bubbles.

The contours come from the alpha silhouette of the actual selected normal or
elite ship artwork. Portrait and side-view registration use the same size,
aspect ratio and rotation as the hull. Mech attack frames get registered contours
as well. The force-field rim sits seven pixels beyond the artwork in a 192-pixel
reference hull (about 3.6 pixels on a 100-pixel ship), removing the large empty
space ahead of the Space Jet's nose. Shields extend slightly farther for armor.

Remaining force-field charges light the forward nodes; the last charge turns
amber. Shield strength controls its armor intensity and indicators. Reduced
motion freezes the traveling rim highlights. Damage absorption, regeneration,
pickup duration and collision shapes are unchanged.

`shipProtection.ts` caches four 256x256 images per hull/pose: three protection
appearances and one hull-clipped repair seam layer. Its bounded cache
holds at most 24 profiles. `protectionGeometry.ts` reads the source alpha and
builds distance fields and uniformly sampled contours during selected-ship
warmup. Normal flight reuses the textures and contour points: one image draw,
two short line strips and a bounded set of charge markers. After warmup, drawing
requires no pixel reads, blur filters, hexagon tessellation or new gameplay particles.

`spaceJetForceField.ts` retains preview-compatible Space Jet entry points that
forward to the same shared renderer. The old oval artwork remains in the asset
folder but is no longer used for player force fields.

`scripts/test-space-jet-force-field.mjs` checks nose clearance, swept wings,
contour continuity, the three visual states, reduced motion, and cache reuse.
Browser captures also cover real ship silhouettes and both flight orientations.
Physical Android performance still requires a device run.
