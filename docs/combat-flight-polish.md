# Combat and flight presentation

Ordinary player ships bank up to eight degrees into lateral movement and settle smoothly when movement stops. This is cosmetic: no inertia is added to controls, hitboxes or movement speed. A bounded eight-entry pose cache is keyed by pilot color so co-op pilots remain independent. Teleports and long frame gaps reset the bank. Core Lander's combat models retain their established pose presentation.

Engine thrust responds to lateral movement as well as forward movement. Its easing uses elapsed time, and the renderer retains the full existing boost range. A shared cyan exhaust atlas texture replaces the ordinary engine's live gradient/shadow work; the original procedural engine remains available if the atlas is unavailable. Existing engine sprite counts and texture sources are reused.

Explosions reach their main bloom at 22% of their lifetime, then spend the remaining time on embers/smoke. Scale expands quickly and opacity reaches zero smoothly. GPU and Canvas use the same curves and existing effect limits. This does not add particle instances, sprite layers, hit-stop, blur passes or render resolution changes.

Hull hits and force-field breaks trigger short, bounded camera feedback. Small hits cannot replace an existing stronger shake, and reduced-motion preferences disable camera shake. Damage, invulnerability and boss attack timing retain their existing rules.

Space doors remain navigation/menu transitions. Automatic raid stage progression retains its original presentation. This pass focuses on Air Raid flight/combat; it does not replace the complete art direction or claim AAA production quality.

Validation: production build and packaging; combat-feel checks for bounded/monotonic impact curves, a clean fade, 30/60/120/144Hz bank agreement, settling and teleport/resume reset; existing boss-art and travel checks. Gameplay screenshots and device FPS remain unverified in this environment.
