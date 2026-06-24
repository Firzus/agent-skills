# Gameplay architecture — C++/BP split, GAS, Subsystems, networking

## The C++ / Blueprint split

- **DO** follow "**C++ foundation, Blueprint leaf logic**": core systems, base
  classes, tick-heavy and loop-heavy code in C++; designer-facing tuning,
  content wiring, and one-shot scripting in Blueprint subclasses.
- **DON'T** build core gameplay frameworks in pure Blueprint — the BP VM is
  interpreted (loops/array access over many actors is dramatically slower)
  and Blueprints can't be text-diffed or merged.
- **DON'T** lock designers out of Blueprint either: C++ cores + BP leaves
  gets both performance and iteration speed.

## Gameplay Ability System (GAS)

- **DO** adopt **GAS** when you have stacking effects, cooldowns, attributes,
  and networked/predicted abilities (RPG, hero shooter, MOBA-like): it gives
  prediction, replication, stacking, and gameplay tags for free.
- **DO** put the AbilitySystemComponent on `PlayerState` for multiplayer
  player characters; define AttributeSets in C++; mutate attributes **only**
  via GameplayEffects.
- **DON'T** adopt GAS for a simple single-player game with three abilities —
  its upfront cost is real.
- **DON'T** bypass GAS once adopted (`SetNumericAttributeBase` from random
  code skips the modifier/cue/prediction pipeline).

## Modularity: Subsystems, Components, GameFeatures

- **DO** use **Subsystems** (`UGameInstanceSubsystem`, `UWorldSubsystem`,
  `ULocalPlayerSubsystem`) for managers and services: automatic lifetime
  scoped to engine/game/world/player, Blueprint-accessible, no fragile
  level-placed singleton actors.
- **DO** favor **composition via ActorComponents** for shared behavior
  (health, interaction, inventory) over deep actor inheritance.
- **DO** use **GameFeatures + Modular Gameplay** plugins
  (`GameFrameworkComponentManager`) for content that ships, toggles, or is
  developed in parallel — feature plugins inject components/abilities/input
  into actors without the core game knowing they exist (the Lyra/Fortnite
  model).
- **DON'T** create singleton UObjects, static globals, or "manager actors"
  placed in every level.

## Gameplay framework placement

- **DO** respect the framework split: rules in `GameMode` (server-only),
  replicated match state in `GameState`, per-player persistent state in
  `PlayerState`, input/possession in `PlayerController`, body in `Pawn`.
- **DON'T** pile everything onto the Character or store player stats on the
  Pawn — Pawns die and respawn, and `GameMode` doesn't exist on clients;
  wrong placement breaks networking and respawn flows.

## Networking

- **DO** design **server-authoritative from day one**: validate on the
  server, replicate state down, use RPCs sparingly, mark properties
  `Replicated`/`ReplicatedUsing` deliberately; consider push-model
  replication and Iris (5.4+) at scale.
- **DON'T** trust the client, and don't plan to "retrofit networking later" —
  retrofitting replication is a rewrite.
