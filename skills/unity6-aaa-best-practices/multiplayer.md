# Multiplayer — netcode stack, authority, dedicated server

Networking is an architectural decision made **early**: the netcode stack, the
authority model, and the client/server split shape gameplay code, prediction,
and build pipeline. Retrofitting them is a rewrite. This page covers the
Unity-specific stack; for engine-agnostic replication theory and drop-in co-op
session design, use the `coop-session` skill.

## Choosing the netcode stack

- **DO** pick the stack up front and commit:
  - **Netcode for GameObjects (NGO) 2.x** — default for most GameObject-based
    games (co-op, small-to-mid session PvP). High-level `NetworkBehaviour`,
    `NetworkVariable`, RPCs.
  - **Netcode for Entities** — for DOTS/ECS-scale simulations (many networked
    entities, client prediction at scale). Pairs with the ECS Core packages and
    the experimental Unity Vehicles package.
- **DON'T** start new work on **NGO 1.x** — deprecated in 6.3 in favor of 2.x
  (`NetworkTransform.Update` → `OnUpdate`). Migrate before building on it.
- **DON'T** mix both netcode stacks in one project — they are not interoperable;
  choose per project, not per feature.

## Authority model

- **DO** decide **client-server vs distributed authority** before writing
  gameplay. NGO 2.x supports **Distributed Authority** (beta) where ownership of
  objects is spread across clients via a relay — good for drop-in co-op and
  social spaces without a dedicated simulation server.
- **DO** keep the server (or authority owner) the source of truth for anything
  exploitable (position validation, damage, inventory, economy); treat clients
  as predictors/renderers.
- **DON'T** trust client input blindly even under distributed authority —
  validate ownership and rate-limit state changes.

## Dedicated server & build pipeline

- **DO** use the **Dedicated Server** build target with **Multiplayer roles** to
  strip client-only assets/code from server builds (and vice versa) per build
  target — smaller, cheaper headless builds.
- **DO** drive server builds through **Build Profiles** (per-role scene lists,
  scripting defines) and run them in CI like any other target (see
  [workflow.md](./workflow.md)).
- **DON'T** depend on **Multiplay Hosting** as configured pre-6.3 — it was
  removed from the Editor/runtime in 6.3 (service sunset). Plan hosting on the
  current Multiplayer Services / third-party hosting path instead.

## Services, sessions & matchmaking

- **DO** use the **Multiplayer Services** package for sessions, **Relay**,
  **Lobby**, and matchmaking instead of hand-rolling connection flows. The
  **Multiplayer Center** (Window menu) scaffolds the right packages for the
  chosen topology.
- **DO** lean on **Matchmaker** enhancements (6.4): CEL OR-operator pools/filters,
  config history with diffs, dashboard log access, third-party hosting hooks.
- **DON'T** build new UI on **Multiplayer Widgets** — deprecated in 6.3 in favor
  of **Unity Building Blocks**; use widgets only for throwaway prototypes.
- **DO** prototype with the cloud iteration tools where useful — **Cloud Code**
  gained an experimental **stateful** mode + local server (6.5) for
  per-player/session state without standing up dedicated servers early.

## Related

- Engine-agnostic replication, interest management, and drop-in co-op session
  architecture: `coop-session` skill.
- Server-authoritative persistence (inventory, saves): `save-persistence` and
  `inventory-equipment` skills.
