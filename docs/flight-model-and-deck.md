# Flight models and living carrier deck

God Gundam, its powered-up variant and Spiegel use new 1536 × 1024 transparent
landscape flight art. Their bodies lean into forward travel and legs trail
behind. The existing portrait art remains separate. All art uses aspect-preserving
contain rendering. Hand, shoulder, head and thruster anchors are measured in the
same hull-size units and transformed once into logical flight coordinates.

- God Gundam energy techniques originate at the open palm.
- Spiegel's Messer Glanz fan originates at the throwing hand.
- Ordinary ballistic/pickup fire uses the shoulder ports; laser/needle origins use
  the head. Projectile speed, damage, cadence and hitboxes do not change.
- Powered-up God Gundam keeps the same hand/head/shoulder positions. Its six fins
  open and its green chest core activates; no engine plume is baked into the art.
- Nozzle positions and the powered-up ring follow the scaled model.

The generated flight sprites are versioned WebP siblings in
`public/assets/ships/sideview/*flight-v2.webp`. The built-in image edits preserved
armor identity and colors, changed the articulated pose to rightward flight,
required complete limbs/antennae and transparent backgrounds, and excluded baked
projectiles, exhaust, smoke, halos, scenery and text. The powered-up edit used the
normal flight sprite as its pose reference and the previous powered-up sprite as
its chest/fin reference.

## Deck choreography

The same gameplay-time clock drives the ship and the boarding sequence:

| Time | Action |
| --- | --- |
| Briefing | Tiny patrol crew work on maintenance catwalks. Pilot waits. Marshal signals with two illuminated wands. |
| 0–2.8 s | Pilot walks to the boarding point, climbs aboard, and disappears behind the hull. Engines remain cold. |
| 2.8–3.8 s | Marshal clears the lane and retreats behind deck equipment. |
| 3.8–5.4 s | Ignition builds, then clamps retract. |
| 5.4–8.4 s | Ship accelerates through the aperture; carrier slides away. |
| 8.4–10.2 s | Camera settles into combat framing. |

No boarding crew are drawn during Mesiah's existing in-flight opening.
Personnel are procedural micro-sprites, intentionally around 8–12 CSS pixels tall.
Their paths and lamp/fan locations are authored in background-image coordinates.
One shared cover/crop transform aligns the decoration with each orientation's
actual maintenance decks. The rotors cover only the existing fan discs, retaining
housing artwork. Two small inset service fans on the portrait maintenance decks remain visible when tall-phone cropping hides the outer rotors. Lamp glow textures are baked once and reused, with no per-frame blur filters. Lamps follow the orientation of the existing light strips.

The deck canvas rides on its own unmasked layer with the same carrier transform. Authored paths stay outside the aperture, so crew cannot float in space. Keeping the moving canvas separate preserves the cached static doorway mask; rotors and lamp textures are also baked once. Pause freezes the deck clock.
Reduced motion keeps static crew/rotors and uses discrete boarding/clearance cuts.
Low detail omits background patrols while preserving the pilot and marshal.

Tests sample boarding clearance before ignition at 30/60/120 Hz, check alpha and
sprite dimensions, and verify per-model firing/nozzle coordinates over viewport
shapes and ship scales. Browser recordings cover both landscape models plus
portrait, compact and reduced-motion boarding/departure, and paused deck clocks.
