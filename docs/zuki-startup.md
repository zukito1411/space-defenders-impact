# ZUKI studio opening

The original creator logo is copied unchanged from Tales of Leighneron 2D:

- Source repository: `zukito1411/mernondna-rpg-base`
- Source commit: `245c8e1c32b2795ea3183d5e66c821bce588a763`
- Source path: `public/assets/reference/game-load.png`
- Git blob SHA: `9e99a440108247cf8cbf9a4b5d2e30a2371eae01`
- Local asset: `public/assets/brand/zuki-logo-v1.png` (1254×1254 RGBA, unchanged)

The black opening screen exists in `index.html` before the application bundles
load. It retains the original white logo, native aspect ratio and copyright line.
Its size adapts to portrait/landscape and leaves room for safe-area insets.
The logo fades in, remains readable, and fades into the mounted menu once its
artwork settles. A bounded deadline and image-error fallback prevent a missing
optional image from trapping the app behind the opening. Tap, Enter, Space or
Escape can skip it. Reduced motion removes the fades.

The intro appears once per fresh document/app launch, never on returning from
gameplay to the menu. Menu controls, gamepad input, audio unlock and the initial
commander-name dialog wait until the logo is dismissed. The app can prepare its
existing assets behind the inert opening. Timers, frames and listeners clean up
on unmount and React StrictMode replay. No save/progression data is modified.
