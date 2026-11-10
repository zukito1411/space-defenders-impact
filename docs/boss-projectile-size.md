# Boss projectile visibility

The boss atlas's guaranteed 32px transparent cell gutters made the actual artwork much smaller than its sprite rectangle. Projectile frames now omit 24px of empty gutter on each edge, retaining 8px before the original artwork for filtering. All removed pixels were checked to have zero alpha. Texture bytes and texture-source count are unchanged.

Squid bubbles/ink/spines and snake fangs/spit use a 1.7 visual multiplier instead of 1.2. Combined with the tighter frame, their visible linear dimensions grow by approximately 72%. Carrier bolts, plasma, void/orb shots and super shots also use larger render rectangles; blade/needle/scatter graphics are wider. Both GPU and Canvas consume the shared materials and geometry. GPU culling uses the resulting enlarged dimensions.

Poison clouds retain their existing frame and render multiplier so their area warning remains consistent. Beam geometry and every projectile's damage, collision radius, trajectory and lifetime are unchanged. Drawing larger quads increases pixel coverage, so this is not a promise of identical device FPS. It adds no sprite instances, particles, blur passes or texture uploads.

The space door remains attached to menu/navigation actions. Raid stage-clear announcements and automatic stage progression keep their original presentation.

Validation: production build and asset packaging; shared boss-art regression checks for enlarged frames and unchanged clouds; zero-alpha gutter inspection. Device FPS and gameplay appearance remain unverified in this environment.
