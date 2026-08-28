# Vehicles — terrain gating, build-your-own, and crews

Animal and creature mount lifecycle belongs to `mount-system`. This file covers
the world-design role of mechanical vehicles until a dedicated `vehicle-system`
owns vehicle runtime, suspension, buoyancy, seats, and control.

## Vehicle traversal

- **Death Stranding** — vehicles (trikes/trucks) extend capacity but are
  **terrain-gated** (useless on mountains without pre-built roads); the chiral
  network co-builds roads/zip-lines (zip-lines become a minimum-spanning-tree
  optimization). DS2's earlier/easier vehicles diluted the original's on-foot
  tension — the cautionary note.
- **TotK Zonai — build-your-own**: Ultrahand glues parts; Autobuild re-summons
  blueprints from materials/Zonaite; the **physics constraints are the game**
  (weight/center-of-gravity, battery drain, wing balance). The emergent meta is the
  Hoverbike (2 fans + steering stick) — a generative sandbox bounded by battery and
  part count.
- **Just Cause — the momentum loop**: grapple + parachute + wingsuit cycle =
  effectively infinite flight by skill (**slingsuiting** is the only way to gain
  upward velocity in the wingsuit); the most kinetic open-world traversal, where
  momentum mastery is itself the reward.
- **Driving handling**: the arcade↔simcade↔sim spectrum — physics-first (remove
  complexity from a full sim) vs arcade (add mechanics until it "feels good"). The
  **tire model is the crux**: sims use the Pacejka "Magic Formula" (slip angle +
  load → force), so understeer/oversteer *emerge* from tire forces + weight
  transfer; arcade uses binary grip and "brake-to-drift". No game simulates full
  fidelity.

## Multi-crew / cooperative traversal

- **Sea of Thieves** — the ship is a **shared vehicle** needing distributed roles
  (helm, sails, capstan/anchor, navigation, lookout, repair). Two sail controls
  (**length** = wind caught, **angle** = align to wind, with a flap/stretch + audio
  cue when optimal); ship classes trade speed for crew load (Sloop best into
  headwind, Galleon fastest with tailwind but hardest). **Coordination friction *is*
  the content** — anchor-turning and sail trim in battle create emergent crew drama.

## Scope boundary

Use this traversal reference to decide how vehicle access changes routes, terrain,
resources, and co-op roles. Route implementation of mechanical movement, tire/
suspension forces, buoyancy, multi-seat possession, and damage to a future
`vehicle-system`.

Do not reuse `mount-system` merely because both systems carry a player. Creature
mounts and physics-driven vehicles have different movement, collision, animation,
seat, and network contracts.

## Flagged gaps — do NOT invent

Treat title-specific physics values, vehicle balance numbers, and community-discovered
metas as examples, not portable production defaults. Verify current implementation
claims against first-party material before using them as evidence.

## Sources

Game Developer (Death Stranding design; racing handling models) · Nintendo developer
material (TotK systems) · Avalanche/Just Cause developer material · Rare/Sea of
Thieves release notes and developer material.
