---
name: software-architecture
description: >-
  Stack-agnostic software architecture guidance for any kind of software —
  game, desktop app, web/SPA, backend service, CLI. Picks the lightest macro
  structure and micro/runtime pattern for the problem, with per-domain
  examples, costs, and explicit "avoid when" guidance. Use when designing or
  refactoring an app's architecture, choosing how to layer or modularize code,
  drawing module/process boundaries (including IPC), managing dependencies and
  coupling, structuring state and persistence, handling
  errors/logging/config/async across boundaries, or when the user mentions
  layering, hexagonal/clean/onion, ports and adapters, dependency inversion,
  DDD, ECS, design patterns, state management, CQRS, or over-engineering.
---

# Software Architecture

Use this skill to make and defend architecture decisions for **any** software —
not just games. It replaces ad-hoc structure with a deliberate choice from two
planes:

- **Macro (structural):** how the whole app is decomposed and which way
  dependencies point. → [macro-structures.md](./macro-structures.md)
- **Micro (tactical/runtime):** how a local code problem is solved.
  → [runtime-patterns.md](./runtime-patterns.md), plus the game backbone in
  [game/README.md](./game/README.md).

## The one rule everything else serves

> **Choose the simplest structure that makes the next change easy.**

Most pain comes from **over-application** of patterns, not ignorance of them.
Every pattern adds indirection; indirection has a cost. When unsure, build the
concrete, possibly duplicated thing and let the third real instance reveal the
abstraction (see [principles.md](./principles.md)).

## Workflow when making an architecture decision

```
- [ ] State the problem in one sentence (e.g. "the domain imports the
      database", "input is hard-wired to actions", "state is duplicated and
      drifts")
- [ ] Pick the plane: macro (whole-app shape) or micro (local mechanism)
- [ ] Find the candidate in the matching table below
- [ ] Read its card (intent, when to choose, when to avoid, per-domain example)
- [ ] Confirm it's the lightest option that solves it (no simpler structure
      works)
- [ ] Check dependency direction (inward) and boundaries (no leaks)
- [ ] For optimization/distribution patterns: confirm a real, measured need
- [ ] Implement
- [ ] Re-scan with the over-engineering checklist in
      [principles.md](./principles.md)
```

## Plane 1 — Macro: choose a structure

Full cards + comparison table + decision tree in
[macro-structures.md](./macro-structures.md).

| Structural question / symptom | Candidate structure |
| --- | --- |
| Simple CRUD, thin business rules, ship fast | **Layered / N-tier** |
| Business rules matter; infra (DB, UI, channels) will change | **Hexagonal (Ports & Adapters)** |
| Long-lived domain, many use cases on stable entities | **Onion / Clean** |
| One deployable, but want hard internal module seams | **Modular monolith** |
| Independent scaling/deploy, team autonomy (real need) | **Microservices** |
| Organize by feature, not by technical layer | **Vertical slice** |
| Components react to facts; async, decoupled producers | **Event-driven** |
| The top-level folders should scream the **domain** | **Screaming architecture** (see [principles.md](./principles.md)) |

Cross-cutting structural concerns — module boundaries, coupling/cohesion,
dependency inversion, ports, anti-corruption layers, breaking cycles, enforcing
boundaries in CI — live in
[boundaries-and-dependencies.md](./boundaries-and-dependencies.md).

## Plane 2 — Micro: pick a runtime pattern

Match the symptom you actually have. Full cards (intent, modern alternative,
"avoid when", per-domain declensions) in
[runtime-patterns.md](./runtime-patterns.md). For **game** runtime patterns,
start from [game/README.md](./game/README.md).

| Symptom / problem | Candidate pattern(s) |
| --- | --- |
| Growing `if/else` choosing *how* to do something | **Strategy** (→ function) |
| Need undo/redo, queue, log, or send an action across a process | **Command** (→ closure) |
| One part must react to another without hard coupling | **Observer / Pub-Sub** |
| Decouple in *time*: buffer, aggregate, cross-thread/process | **Event Queue / Bus** |
| 3+ interacting booleans; illegal states reachable | **State machine** |
| Expensive + bounded resource churns (connections, threads) | **Object Pool** |
| Recomputing expensive derived data eagerly | **Dirty Flag / memoization** |
| UI/state must track changing data efficiently | **Reactive state (signals)** |
| "Needs global access" temptation | **DI** (not Singleton) |
| Read and write shapes diverge; audit/replay needed | **CQRS / Event Sourcing** (see [state-and-data.md](./state-and-data.md)) |
| Distributed side effects must be safe to run twice | **Outbox / Saga / Idempotency** |
| Game loop, ECS, spatial partition, double buffer, type object | **Game runtime patterns** ([game/README.md](./game/README.md)) |

## Reference map

| File | Covers |
| --- | --- |
| [macro-structures.md](./macro-structures.md) | Layered, Hexagonal, Onion, Clean, Modular monolith, Microservices, Vertical slice, Event-driven — cards, comparison table, per-domain manifestations, anti-patterns, decision tree |
| [boundaries-and-dependencies.md](./boundaries-and-dependencies.md) | Coupling vs cohesion + connascence, DIP, DI vs Service Locator, Ports & Adapters, Anti-Corruption Layer & bounded contexts, acyclic dependencies, enforcing boundaries with architecture linters |
| [runtime-patterns.md](./runtime-patterns.md) | Tactical/runtime patterns beyond game-dev: GoF today, Strategy, Command, Observer, Event Queue, State machine, Object Pool, Dirty Flag, Reactive state, DI, plus backend (Outbox/Saga/Idempotency) and desktop (Tauri/Electron IPC) declensions |
| [state-and-data.md](./state-and-data.md) | Single source of truth, derived vs primary state, server vs client state, unidirectional flow, Repository/Unit of Work/DTO, CQRS & Event Sourcing (when it's overkill), optimistic updates & local-first |
| [cross-cutting.md](./cross-cutting.md) | Error handling (typed vs exceptions, translate at boundaries), logging & observability, configuration & secrets, concurrency & cancellation, process boundaries (IPC) & schema versioning |
| [principles.md](./principles.md) | SOLID + non-OOP, YAGNI/KISS/rule of three, coupling & cohesion as the compass, when a pattern hurts, essential vs accidental complexity, Gall's law, screaming architecture, strategic DDD, decision checklists |
| [game/README.md](./game/README.md) | Game runtime patterns (Robert Nystrom, _Game Programming Patterns_): index of the game backbone — sequencing, behavioral, decoupling, optimization patterns, GoF revisited, game architecture principles |

## Per-domain lens

Patterns manifest differently per domain (game, desktop Tauri/Electron,
web/SPA + API, backend service). Every reference file carries a per-domain
declension section — read the one for your domain before applying a card.

## Core rules

- **Dependencies point inward / toward stability.** The domain core must not
  import infrastructure, the framework, or the UI. This single inversion is what
  separates Clean/Hexagonal/Onion from naive N-tier.
- **No writable data in two places.** Any datum that is writable in two stores is
  a bug in waiting. It's either derived (compute it), a cache (invalidate from the
  authority), or you must elect one source of truth.
- **Translate at boundaries.** Foreign and infrastructure types (ORM entities,
  HTTP requests, SQL errors, external DTOs) must not leak across a boundary — map
  them in the adapter (Anti-Corruption Layer).
- **Type the serialized edges.** IPC and network boundaries lose type safety by
  default; generate typed bindings/contracts from a single source of truth and
  version them (stable field numbers, `reserved`, contract tests).
- **Prefer the language feature.** When a pattern became a language feature
  (Command → closure, Strategy → function, Singleton → DI/module value),
  hand-rolling the "pattern" version is the anti-pattern.
- **Centralize cross-cutting concerns** (logging, auth, retries, tracing) at the
  boundary via middleware/decorator/pipeline — never scatter them through the
  domain.
- **Measure before optimizing.** Optimization patterns trade simplicity for speed
  or memory; apply them only when a profiler shows the bottleneck.

## Source

Game backbone: Robert Nystrom, _Game Programming Patterns_
(https://gameprogrammingpatterns.com/contents.html). The generalist material
synthesizes current practice on macro structures, module boundaries, runtime
patterns, state management, cross-cutting concerns, and architecture
principles; reference files cite their sources inline.
