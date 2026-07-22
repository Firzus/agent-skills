# Mover build workflow

Use this reference before naming Unreal symbols, editing movement code, or
accepting an engine upgrade. Mover APIs and data formats are version-sensitive;
the installed plugin is the implementation source of truth.

## Contents

- [Capability gate](#capability-gate)
- [Project-owned adapter](#project-owned-adapter)
- [Default Set baseline](#default-set-baseline)
- [Native replay data](#native-replay-data)
- [Tick and proxy baseline](#tick-and-proxy-baseline)
- [Simulation discipline](#simulation-discipline)
- [Tracer-slice order](#tracer-slice-order)
- [Engine-upgrade gate](#engine-upgrade-gate)

## Capability gate

Run this gate before writing a recipe copied from documentation or examples.

1. Find the `.uproject`, its `EngineAssociation`, target files, module rules,
   plugin list, and any project/plugin source that already wraps movement.
2. Resolve the actual engine installation or source checkout used by the project.
3. Inspect the installed Mover, Network Prediction, and optional Motion Warping
   plugin descriptors, modules, public headers, examples, and release material.
4. Confirm the required concepts and symbols in that installation.
5. Record capability evidence as `supported`, `supported with project adapter`,
   `missing`, or `unknown`.
6. Stop `build` on a missing required capability. Keep Mover as the architecture;
   do not silently generate CMC code.

Use repository search rather than guessing paths. Adapt these probes to the
resolved project and engine roots:

```text
rg -n 'EngineAssociation|Mover|NetworkPrediction|MotionWarping' <project-root>
rg --files <engine-root>/Engine/Plugins | rg 'Mover|NetworkPrediction|MotionWarping'
rg -n 'UCharacterMoverComponent|DefaultMovementSet' <installed-mover-source>
rg -n 'InputCmd|SyncState|AuxState|Reconcile|Interpolate|Merge|Decay' <installed-mover-source>
rg -n 'Teleport|BasedMovement|Swimming|RootMotion|MotionWarp' <installed-plugin-source>
```

Do not infer capability from an online page alone. Documentation may describe a
different engine revision.

### Capability matrix

At minimum, record:

| Capability | Evidence to find | Required response if absent |
| --- | --- | --- |
| Character-specialized Mover | Installed class/header and module | Stop build; do not substitute CMC |
| Kinematic Network Prediction backend | Installed backend/config path | Stop build or narrow to design-only |
| Default walking/falling behavior | Registered modes and transition path | Implement project-owned mode only if Mover supports the required seam |
| Surface swimming | Installed water-volume mode and controls | Treat swimming as custom; do not claim Default Set support |
| Native replay data extension | Installed data interfaces and serialization/reconcile hooks | Stop networked custom-state build |
| Moving bases | Relative-base state and update utilities | Keep base support unaccepted until a project adapter and tests exist |
| Teleport/instant state change | Installed instant-effect path | Implement through the verified equivalent; never direct transform writes |
| Root motion/Motion Warping | Installed Mover integration path | Use in-place/layered motion or stop the requested root-motion slice |
| Debugging | Mover logging/debugger and Network Prediction capture | Add project observability before accepting the slice |

Treat Mover's maturity/status in the installed version as an explicit project
risk. Do not describe it as universally production-ready or battle-tested.

## Project-owned adapter

Keep game code behind a narrow project module rather than exposing concrete Epic
types across traversal, combat, AI, and animation.

```text
Project movement interface
  semantic requests + outcomes + presentation facts
                     |
Project Mover adapter
  installed data types + mode registry + effect handles
                     |
Installed character-specialized Mover / Network Prediction
```

Own these artifacts in project code:

- semantic mode and transition IDs;
- native intent, traversal/action request, and replay-state structs;
- Mover registration/configuration for project modes and transitions;
- translation between project requests and installed layered move, modifier, or
  instant-effect representations;
- stable reason codes and presentation-state extraction;
- capability/conformance tests for each engine version.

Do not wrap every Mover method one-for-one. The adapter earns its seam by hiding
version churn and presenting a smaller gameplay interface.

## Default Set baseline

Use verified Default Character Movement Set behavior as a bootstrap, not as the
game's public architecture. Epic describes the set as one CMC-like bridge that
can be partly or wholly replaced.

- Reuse installed walking, falling, jumping, and swimming behavior only where it
  satisfies the movement contract.
- Add project-owned climbing, gliding, and underwater modes after proving the
  base network slice.
- Keep the runtime mode registry stable unless the installed version explicitly
  supports and passes runtime replacement tests.
- Inspect collision-shape assumptions. Do not assume all Default Set modes accept
  an arbitrary root shape merely because core Mover can move different shapes.
- Express sprint or stance as resolved parameter changes/modifiers, not as a
  second movement state machine.
- Keep world affordance discovery and persistent stamina outside the mode.

## Native replay data

Prefer native C++ data for the networked shipping path. Inspect the installed
interfaces and implement the serialization, comparison, merge, interpolation,
and decay behavior they actually require.

For every field:

1. Define its semantic owner and authority.
2. Decide whether it is per-frame input, frequently changing canonical state,
   rare configuration state, or a reconstructible local cache.
3. Define what difference requires reconciliation.
4. Define how multiple input samples merge into a simulation tick.
5. Define proxy interpolation only for fields that have meaningful interpolation.
6. Clear or decay one-shot requests explicitly.
7. Add a rollback test that changes the field at the edge of a correction.

Avoid these shortcuts:

- live `PlayerController`, camera, target, Ability System, or world-policy reads
  from simulation code;
- raw object pointers whose identity is not stable and network-resolvable;
- Blueprint-authored values read live when they can change during replay;
- a generic equality check that reconciles on presentation-only differences;
- one-shot booleans with no sequence identity or decay rule.

Blueprints and data assets may author tuning. Resolve their movement-affecting
values into stable configuration or replay state before simulation.

## Tick and proxy baseline

Use the installed Mover Examples configuration only as a starting hypothesis.
The current public examples recommend fixed simulation ticking, interpolated
simulated proxies, and fixed-tick smoothing; verify the matching settings and
behavior in the installed version.

Validate:

- zero, one, and multiple simulation ticks within a render frame;
- input accumulation/merge across game frames;
- low and high render rates without changing movement outcomes beyond declared
  tolerance;
- autonomous correction and resimulation;
- simulated-proxy interpolation through starts, stops, turns, mode changes,
  moving bases, teleports, and root motion;
- server-authored AI using the same canonical movement state;
- side-effect deduplication when a simulation frame runs again.

Do not equate fixed ticking with bitwise determinism. It provides a shared
simulation schedule; replay completeness and convergence still require tests.

## Simulation discipline

Keep the simulation pipeline one-directional:

```text
captured command
  -> transition evaluation
  -> active mode proposal
  -> layered move/modifier arbitration
  -> swept collision and based movement
  -> canonical output state
  -> reconcile/interpolate/present
```

- Validate buffered requests when consumed, not only when captured. Store the
  required context and timeframe with the request.
- Distinguish a collision hit, a contact, and a stable floor.
- Revalidate each mode's physical preconditions and provide a safe fallback.
- Bound depenetration and expose unresolved penetration as a diagnostic outcome.
- Use Mover's installed sweep/collision path; do not add a parallel manual
  collide-and-slide transform writer.
- Treat transition order as gameplay data. Make priorities observable and test
  ambiguous frames.
- Do not dispatch irreversible effects from replayed callbacks without a
  confirmed-frame/deduplication policy.

## Tracer-slice order

Build the smallest end-to-end slice that proves each new dependency.

### Slice 1: dedicated-capable walking and falling

- Capture camera-relative intent outside simulation.
- Run verified Default Set ground/fall behavior through project-owned state.
- Publish presentation facts.
- Prove stable floor, slope/step, jump/fall, and render-rate behavior.
- Run player intent through autonomous prediction and server reconciliation.
- Present simulated proxies through the selected smoothing path.
- Run server-authored AI through the same intent interface.

Done when standalone, listen, and dedicated multi-process tests expose the same
semantic walking/falling outcomes within project-defined tolerance, movement has
one writer, and tests distinguish contact from stable floor.

### Slice 2: adverse-network reconstruction

- Add correction, resimulation, and side-effect counters.
- Exercise latency, jitter, loss, duplication, and reordering.
- Reconstruct current authoritative state for join-in-progress and reconnect.
- Verify one-shot requests and confirmed side effects remain deduplicated.

Done when adverse networking and reconstruction converge without duplicate
movement requests, side effects, or competing writers.

### Slice 3: moving bases

- Capture stable base identity, relative transform, and required inherited
  velocity facts.
- Test translating, rotating, tilting, invalidated, and destroyed bases.
- Define detach, jump-off, crush, and unresolved-base fallbacks.

Done when based movement survives correction and base loss without an external
transform write.

### Slice 4: traversal modes

- Add one custom mode at a time behind `Traversal Request → Movement Outcome`.
- Start with entry, steady state, loss, exhaustion, cancellation, and fallback.
- Add surface/underwater transitions before sharing water-resource logic.

Done when each mode passes its lifecycle and rollback matrix independently.

### Slice 5: action movement and teleport

- Add dash/lunge/knockback handles before authorized root motion.
- Add root motion/Motion Warping only through the verified installed adapter.
- Add typed teleport after streaming readiness and server validation exist.

Done when cancellation cleans every temporary influence, removing Anim Notifies
does not break gameplay lifetime, and teleport satisfies all postconditions.

Follow [validation.md](./validation.md) for the full acceptance matrix.

## Engine-upgrade gate

On every engine upgrade:

1. Rerun the capability matrix against installed descriptors and headers.
2. Review changed Mover/Network Prediction data layouts, ticking, transitions,
   based movement, swimming, teleport, root motion, and debugging paths.
3. Compile the project adapter without changing gameplay callers.
4. Run the conformance suite in standalone, listen, and dedicated processes.
5. Compare correction, rollback, proxy, and performance captures with the prior
   accepted baseline.
6. Accept the upgrade only after every required capability is supported or the
   project movement contract is deliberately revised.

## Primary engine anchors

- [Mover overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)
- [Mover features and concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)
- [Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)
- [Mover compared with Character Movement Component](https://dev.epicgames.com/documentation/unreal-engine/comparing-mover-and-character-movement-component-in-unreal-engine)
