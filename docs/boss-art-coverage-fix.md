# Boss Rush artwork coverage correction

The deployed web index and its JavaScript bundle were fetched during this investigation. The bundle referenced both the combat-v2 and boss-v1 atlases and included the travel changes. The latest main-release workflows had succeeded. This establishes web deployment coverage, not which version or foreground renderer was running on the user's device.

The previous six dedicated squid/snake textures were wired only into the GPU foreground. Canvas continued to draw the old procedural bubble, ink, spine, fang, spit and cloud visuals. Both renderers now call `applyRaidBossArtwork` for the same textures, dimensions and rotation. Physical fangs/spines and poison clouds use normal blending. Projectile headings account for viewport aspect ratio.

The otherwise unused red plasma, mechanical carrier bolt, void orb and fire-impact tiles now distinguish generic enemy shots, carrier shots, plasma, orb/void shots and super shots. Existing atlas failure behavior remains available. Beam and charge-warning visuals retain their prior rendering; they have not been redesigned by this patch.

The previous space parallax explicitly excluded water/volcanic boss arenas. Existing island and cloud sprites now receive separate depth offsets after their normal position updates; clouds move more than the distant surface. Low quality still follows its established scenery limits. This adds no texture or sprite instances.

Validation: production build and asset packaging; `node scripts/test-boss-art.mjs` exercises shared artwork, Canvas source/destination geometry, solid fangs, distinct carrier materials and preserved beam fallback; existing travel tests pass. In-game screenshots and device FPS remain unverified in this environment.
