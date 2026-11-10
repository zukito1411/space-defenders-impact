# Forward travel refinement

The prior radial projection assumed head-on travel into a vanishing point. That conflicted with the raid's forward-scrolling viewpoint, causing stars on opposite sides to travel in different directions. Stars now move consistently down the field, with fixed distance layers controlling speed, size, brightness and steering response. Camera steering introduces a small sideways parallax; elapsed forward travel alone never moves stars sideways. Edge fades hide vertical wrapping.

Projected stars now share one 64×64 soft point texture baked once during background initialization, rather than hard white rectangles. It is disposed with the background. No live blur or geometry rebuild is used. The existing bounded star budgets remain in place. Normal flight no longer includes the four long decorative speed quads; these appear only during a stage-clear rush.

Galaxies and the distant star layer have weaker steering parallax than the nearer layers. Existing planet depth differences remain, and whole-image planet spinning is removed so painted lighting and ring orientation do not rotate like a flat sign. Planets still use their existing shaded sprites; this is a depth treatment for the current renderer, not a new 3D sphere engine.

Rocket art is reduced from 86×48 to 76×42 and homing art from 78×44 to 68×38 before viewport scaling. Distinct silhouettes, lock brackets and the previous speed adjustments remain intact. No missile damage, cadence, hitbox or velocity change is introduced by this refinement.

Validation: production build and artwork packaging; regression checks for consistent forward direction on both sides of the screen, absence of radial drift, stronger near-layer speed/parallax, finite/bounded output and edge fades; missile material and travel tests. Gameplay appearance and device FPS remain unverified.
