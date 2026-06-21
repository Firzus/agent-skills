---
name: game-architecture-patterns
description: >-
  Apply battle-tested game architecture patterns while designing and writing
  game code. Maps gameplay/engine problems to the right pattern (Game Loop,
  Update Method, Component/ECS, State, Observer, Event Queue, Command, Object
  Pool, Spatial Partition, Dirty Flag, Service Locator, and more), with concrete
  solution shapes, costs, and anti-usages. Use when designing a game's
  architecture, structuring an entity/scene/system, decoupling gameplay code,
  fixing tangled update/render loops, optimizing hot paths, or when the user
  mentions game loop, ECS, entities, components, state machines, input handling,
  spawning, pooling, collision/spatial queries, or refactoring a game codebase.
  Backbone: Robert Nystrom's "Game Programming Patterns".
---

# Game Architecture Patterns

Use this skill to pick and apply the right architectural pattern when building a
game, instead of reaching for ad-hoc structure. The backbone is Robert
Nystrom's _Game Programming Patterns_, enriched with modern Entity-Component-
System (ECS) and data-oriented design practice.

The goal is **application**, not lecturing: diagnose the problem, choose a
candidate pattern from the table below, then open the matching reference file
for the solution shape, pitfalls, and when to avoid it.

## How to use this skill

1. **Name the problem in one sentence** (e.g. "input is hard-wired to actions",
   "everything updates everything", "spawning bullets stutters the frame").
2. **Look it up** in the symptom → pattern table below.
3. **Open the matching reference file** for the full card (intent, solution,
   pitfalls, when to avoid, related patterns).
4. **Apply the lightest pattern that solves it.** Patterns add indirection;
   indirection has a cost. Prefer the simplest structure that removes the pain.
5. **For optimization patterns, measure first** (see the "measure first" rule).

## Symptom → pattern

Match the symptom you actually have. Candidate patterns link to their reference.

| Symptom / problem | Candidate pattern(s) | Reference |
| --- | --- | --- |
| Need a central heartbeat decoupled from CPU/display speed | **Game Loop** | [sequencing.md](./sequencing.md) |
| Many entities each need per-frame behavior | **Update Method** | [sequencing.md](./sequencing.md) |
| Frame reads state that's being written mid-update (tearing, order bugs) | **Double Buffer** | [sequencing.md](./sequencing.md) |
| Input hard-wired to actions; want remap, replay, undo, AI issuing orders | **Command** | [design-patterns-revisited.md](./design-patterns-revisited.md) |
| Thousands of near-identical objects blow up memory | **Flyweight** | [design-patterns-revisited.md](./design-patterns-revisited.md) |
| One part must react to another without hard coupling | **Observer**, **Event Queue** | [design-patterns-revisited.md](./design-patterns-revisited.md), [decoupling.md](./decoupling.md) |
| Spawn objects by cloning a configured template | **Prototype**, **Type Object** | [design-patterns-revisited.md](./design-patterns-revisited.md), [behavioral.md](./behavioral.md) |
| Entity behavior changes with mode (idle/run/jump, AI phases) | **State** | [design-patterns-revisited.md](./design-patterns-revisited.md) |
| Need exactly one well-known instance (use with caution) | **Singleton**, **Service Locator** | [design-patterns-revisited.md](./design-patterns-revisited.md), [decoupling.md](./decoupling.md) |
| Define many "kinds" of things as data, not code/subclasses | **Type Object** | [behavioral.md](./behavioral.md) |
| Let designers script behavior safely without engine rebuilds | **Bytecode**, **Subclass Sandbox** | [behavioral.md](./behavioral.md) |
| God-class entity mixing render, physics, AI, input | **Component** → **ECS** | [decoupling.md](./decoupling.md) |
| Cross-system messages, deferred/async events, decoupled audio | **Event Queue** | [decoupling.md](./decoupling.md) |
| Provide global access to a service without hard-coding it | **Service Locator** | [decoupling.md](./decoupling.md) |
| Cache-miss-bound update; CPU stalls walking pointers | **Data Locality** (→ ECS/SoA) | [optimization.md](./optimization.md) |
| Recomputing expensive derived data every frame (transforms) | **Dirty Flag** | [optimization.md](./optimization.md) |
| GC spikes / fragmentation from frequent alloc/free (bullets, FX) | **Object Pool** | [optimization.md](./optimization.md) |
| "Check everything against everything" collision/proximity is O(n²) | **Spatial Partition** | [optimization.md](./optimization.md) |

## Pattern catalog by category

The 19 book patterns, grouped as in _Game Programming Patterns_. Open a file for
the structured cards.

- **[design-patterns-revisited.md](./design-patterns-revisited.md)** — GoF
  revisited for games: Command, Flyweight, Observer, Prototype, Singleton, State.
- **[sequencing.md](./sequencing.md)** — Time & frames: Double Buffer, Game
  Loop, Update Method.
- **[behavioral.md](./behavioral.md)** — Defining behavior: Bytecode, Subclass
  Sandbox, Type Object.
- **[decoupling.md](./decoupling.md)** — Breaking dependencies: Component, Event
  Queue, Service Locator.
- **[optimization.md](./optimization.md)** — Performance: Data Locality, Dirty
  Flag, Object Pool, Spatial Partition.
- **[architecture-principles.md](./architecture-principles.md)** — Cross-cutting
  guidance: ECS vs OOP, data-oriented design, coupling/cohesion, when patterns
  hurt.

## Core rules

- **Decouple the what from the when.** Game Loop owns timing; Update Method owns
  per-entity behavior; gameplay code shouldn't poll the clock directly.
- **Composition over inheritance.** Deep entity class hierarchies rot fast.
  Prefer **Component** (and, at scale, **ECS**) over `Goblin extends Enemy
  extends Actor`.
- **Push data out of code.** Use **Type Object** / data-driven config so
  designers tune "kinds of things" without recompiles.
- **Decouple senders from receivers** with **Observer** (synchronous, simple) or
  **Event Queue** (asynchronous, buffered) — pick based on timing needs.
- **Measure first.** Every pattern in `optimization.md` trades simplicity for
  speed or memory. Apply it only when a profiler shows the bottleneck. Premature
  optimization adds complexity you'll pay for in every future change.
- **Singletons are a smell.** Global mutable state hides dependencies and breaks
  testing. Prefer dependency injection; if you need global access, a narrow
  **Service Locator** is the lesser evil. See the cautionary notes in the cards.
- **Patterns are tools, not goals.** The best architecture is the simplest one
  that makes the next change easy. If a pattern doesn't remove real pain, skip
  it.

## Workflow when applying a pattern

```
- [ ] State the problem in one sentence
- [ ] Find candidate pattern(s) in the symptom table
- [ ] Read the pattern card (intent, solution, pitfalls, when to avoid)
- [ ] Confirm it's the lightest fix (no simpler structure works)
- [ ] For optimization patterns: confirm a profiler justifies it
- [ ] Implement the solution shape, keeping coupling minimal
- [ ] Re-check related patterns for follow-on structure
```

## Source

Backbone: Robert Nystrom, _Game Programming Patterns_
(https://gameprogrammingpatterns.com/contents.html), enriched with modern ECS
and data-oriented design practice. Reference files cite the relevant book
sections.
