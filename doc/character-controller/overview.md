# Character Controller

Build the physical execution layer for a networked Unreal character. Keep Mover
as the guarded simulation and the only displacement writer. Let input, traversal,
combat, targeting, camera, and animation communicate through replay-safe data;
never let them move the pawn directly.

## Non-negotiable stance

- Use the installed character-specialized Mover implementation
  (`UCharacterMoverComponent` where verified) on the kinematic Network Prediction
  backend.
- Do not implement or propose a Character Movement Component fallback. If the
  installed Mover capabilities are insufficient, stop the `build` branch and
  report the missing capability.
- Keep simulation-critical code and Input/Sync/Aux data in native C++. Use
  Blueprints for authoring, tuning, and assembly.
- Make the controller dedicated-server capable. Validate standalone, listen
  server, dedicated server, autonomous proxies, and simulated proxies.
- Preserve one displacement authority: modes, layered moves, modifiers, and
  instant effects all resolve through Mover.
- Treat every simulation tick as replayable. Read no raw device, camera, target,
  GAS, external discovery/policy query, or mutable gameplay state during
  resimulation. Allow only the Mover-owned collision/contact queries required to
  execute the captured command.
- Treat Epic examples and public game behavior as references, not shipping code
  or evidence of another game's internal architecture.
- Treat Mover maturity and API churn as explicit project risk. This corpus's
  Mover-only policy is a deliberate choice, not universal AAA consensus.

## Route the request

Choose exactly one primary branch from the user's requested outcome. Do not
silently turn a review or diagnosis into an implementation.

| Branch | Select when the user wants | Primary output |
| --- | --- | --- |
| `design` | architecture, ownership, a movement spec, or a migration plan | A movement contract with mode, data, authority, and validation matrices |
| `build` | a new controller, a refactor, or a concrete movement feature | Working C++/assets plus proportionate tests and captured validation evidence |
| `diagnose` | the cause of broken, jittery, divergent, or slow movement | A reproduction, evidence chain, isolated cause, and regression test proposal |

If the request combines branches, run them in the order `diagnose → design →
build`, but only implement when implementation is authorized.

## Establish the movement brief

Inspect the project before asking questions. Record discovered facts and state
any assumptions. Ask one focused question only when the answer materially changes
the architecture or requested result.

| Fact | Required decision |
| --- | --- |
| Engine | Installed version, launcher or source build, Mover/Network Prediction capabilities |
| Pawn | Shape, one active pawn per controller by default, player and AI intent producers |
| Topology | Standalone, listen, dedicated, expected join/reconnect and co-op pawn-collision behavior |
| Modes | Grounded, falling, surface swim, underwater swim, climb, glide, and project extensions |
| World | Slopes, steps, water volumes, climb affordances, moving/rotating bases, streaming teleport |
| Gameplay | Stamina owner, traversal permission, combat displacement, cancellation, targeting/facing |
| Presentation | In-place locomotion, allowed root motion, presentation facts consumed by animation |

For a Genshin-like open-world profile, start with grounded, falling, climbing,
gliding, surface swimming, and a separate underwater mode. Use general traversal
stamina at the surface and a separate aquatic sprint budget underwater only when
the project requests that product behavior. Do not invent tuning values.

## Preserve the data flow

```text
device / AI
    -> Movement Intent
    -> gameplay + traversal authorization
    -> Mover Input / Sync / Aux state
    -> active mode + layered moves + modifiers + instant effects
    -> collision-resolved Movement Outcome
    -> presentation state for camera and animation
```

Keep these invariants visible in every branch:

1. Input producers express intent; they do not write velocity or transforms.
2. `traversal-system` discovers affordances and owns world rules. The controller
   accepts a `Traversal Request`, revalidates the active contact/anchor, and
   returns a `Movement Outcome`.
3. GAS is optional and external. An adapter converts abilities and resource
   authorization into replay-safe Mover requests.
4. Combat owns combo graphs, cancel windows, target requirements, costs, and
   group actions. The controller owns collision-resolved displacement.
5. Targeting alone selects targets; camera and targeting provide desired
   facing/input facts. They are never read from inside the simulation.
6. Animation consumes movement facts. Root motion contributes only through a
   Mover-supported path; Anim Notifies are never sole gameplay authority.
7. `mount-system` owns mount lifecycle and movement. The controller exposes the
   rider suspend/resume and on-foot safe-placement contract; a mount never becomes
   an implicit character movement mode.

Read [architecture.md](./architecture.md) whenever defining or changing one of
these seams.

## `design` branch

1. Read [architecture.md](./architecture.md) and run the capability/risk gate in
   [mover-build.md](./mover-build.md) far enough to classify required engine facts
   as supported, adapter-required, missing, or unknown.
2. Read [movement-modes.md](./movement-modes.md) for every requested mode or
   world interaction.
3. Read [combat-animation.md](./combat-animation.md) when abilities, targeting,
   facing, root motion, Motion Warping, or animation are involved.
4. Produce a movement contract containing:
   - ownership and displacement-authority table;
   - mode/transition matrix with explicit priorities and loss conditions;
   - Input/Sync/Aux/rollback-blackboard allocation;
   - typed requests, outcomes, cancellation, and teleport policies;
   - topology and validation matrix;
   - version-sensitive capabilities and unresolved risks.
5. Mark facts, project policies, and inferences distinctly.

Complete `design` only when each movement-affecting fact has one owner, one
replay representation, and an observable validation case.

## `build` branch

1. Read [architecture.md](./architecture.md), [mover-build.md](./mover-build.md),
   [movement-modes.md](./movement-modes.md), and [validation.md](./validation.md).
2. Read [combat-animation.md](./combat-animation.md) only when the slice touches
   actions, facing, root motion, warping, or animation presentation.
3. Run the capability gate before writing version-specific code.
4. Build tracer slices in dependency order: dedicated-capable walking/falling,
   adverse-network reconstruction, moving bases, requested traversal modes,
   teleport, then combat displacement.
5. Add tests at the project-owned interfaces, not against incidental Mover
   implementation details.
6. Capture validation evidence in every required topology.

Complete `build` only when the requested slice works through Mover, resimulates
without external state reads, has no competing transform writer, and passes its
declared validation matrix. If a topology or capability cannot be exercised,
report the branch as incomplete rather than claiming success.

## `diagnose` branch

1. Read [diagnostics.md](./diagnostics.md) and the reference matching the failing
   mode or integration.
2. Reproduce in the smallest relevant topology; do not begin with tuning.
3. Capture input, mode, transition, base/contact, layered-move, Sync/Aux, and
   correction evidence over the same simulation frames.
4. Locate the first divergent fact or competing writer.
5. State the cause and the smallest regression test. Implement a fix only when
   requested.

Complete `diagnose` only when evidence connects symptom to cause and distinguishes
the cause from downstream animation, camera, and smoothing artifacts.

## Reference map

| Reference | Load when |
| --- | --- |
| [architecture.md](./architecture.md) | Defining ownership, interfaces, replay data, authority, player/AI adapters, or the rider mount handoff |
| [mover-build.md](./mover-build.md) | Inspecting an Unreal project or implementing native Mover/Network Prediction code |
| [movement-modes.md](./movement-modes.md) | Designing or building locomotion modes, stamina, moving bases, water, climb, glide, or teleport |
| [combat-animation.md](./combat-animation.md) | Integrating combat movement, targeting/facing, root motion, Motion Warping, or animation |
| [diagnostics.md](./diagnostics.md) | Investigating movement, collision, rollback, proxy, base, or animation symptoms |
| [validation.md](./validation.md) | Defining tests, network emulation, completion gates, or engine-upgrade conformance |

## Stop conditions

Stop and report a concrete blocker when:

- the installed engine lacks a required Mover or Network Prediction capability;
- the project requires a physics-driven Chaos character instead of the selected
  kinematic backend;
- another system must remain an uncontrolled transform/velocity writer;
- movement depends on data that cannot be captured or reconstructed for replay;
- server, client, or proxy behavior required by the request cannot be exercised.

Do not hide these conditions behind generic advice, a CMC fallback, or unverified
sample code.
