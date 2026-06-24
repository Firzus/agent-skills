---
name: software-architecture
description: >-
  Stack-agnostic software architecture guidance for any kind of software — game,
  desktop app, web/SPA, backend service, CLI. Picks the right MACRO structure
  (layered, hexagonal/ports-and-adapters, onion, clean, modular monolith,
  microservices, vertical slice, event-driven) and the right MICRO/runtime
  pattern (State, Observer, Command, Event Queue, Object Pool, Strategy, DI,
  state machines, CQRS...), with per-domain examples, costs, and explicit
  "avoid when" guidance. Backbone: simplicity-first — the smallest structure
  that makes the next change easy. Use when designing or refactoring an app's
  architecture, choosing how to layer or modularize code, drawing module/process
  boundaries (including IPC), managing dependencies and coupling, structuring
  state and persistence, handling errors/logging/config/async across boundaries,
  or when the user mentions architecture, layering, hexagonal/clean/onion, ports
  and adapters, DDD, coupling, dependency inversion, ECS, design patterns, state
  management, CQRS, or over-engineering.
---

# Software Architecture

Use this skill to make and defend architecture decisions for **any** software —
not just games. It replaces ad-hoc structure with a deliberate choice from two
planes:

- **Macro (structural):** how the whole app is decomposed and which way
  dependencies point. → [macro-structures.md](./macro-structures.md)
- **Micro (tactical/runtime):** how a local code problem is solved.
  → [runtime-patterns.md](./runtime-patterns.md), plus the game backbone in
  [game/](./game/design-patterns-revisited.md).

The goal is **application, not lecturing**: name the problem, pick the lightest
structure or pattern that removes the pain, and apply it. Every pattern adds
indirection; indirection has a cost.

## The one rule everything else serves

> **Choose the simplest structure that makes the next change easy.**

Clean Architecture on a CRUD app is over-engineering; an unstructured "big ball
of mud" on a long-lived domain is debt. Most pain comes from **over-application**
of patterns, not ignorance of them. When unsure, build the concrete, possibly
duplicated thing and let the third real instance reveal the abstraction (see
[principles.md](./principles.md)).

## How to use this skill

1. **Name the problem in one sentence** (e.g. "the domain imports the database",
   "input is hard-wired to actions", "state is duplicated and drifts").
2. **Decide which plane you're on** — structural (whole-app shape) or tactical
   (one local mechanism) — using the two tables below.
3. **Open the matching reference** for the decision card (intent, when to choose,
   when to avoid, per-domain example).
4. **Apply the lightest option that solves it**, then re-check for
   over-engineering with the checklist in [principles.md](./principles.md).

## Plane 1 — Macro: choose a structure

Match the structural question to a candidate. Full cards + comparison table +
decision tree in [macro-structures.md](./macro-structures.md).

| Structural question / symptom | Candidate structure | Reference |
| --- | --- | --- |
| Simple CRUD, thin business rules, ship fast | **Layered / N-tier** | [macro-structures.md](./macro-structures.md) |
| Business rules matter; infra (DB, UI, channels) will change | **Hexagonal (Ports & Adapters)** | [macro-structures.md](./macro-structures.md) |
| Long-lived domain, many use cases on stable entities | **Onion / Clean** | [macro-structures.md](./macro-structures.md) |
| One deployable, but want hard internal module seams | **Modular monolith** | [macro-structures.md](./macro-structures.md) |
| Independent scaling/deploy, team autonomy (real need) | **Microservices** | [macro-structures.md](./macro-structures.md) |
| Organize by feature, not by technical layer | **Vertical slice** | [macro-structures.md](./macro-structures.md) |
| Components react to facts; async, decoupled producers | **Event-driven** | [macro-structures.md](./macro-structures.md) |
| The top-level folders should scream the **domain** | screaming architecture | [principles.md](./principles.md) |

Cross-cutting structural concerns — module boundaries, coupling/cohesion,
dependency inversion, ports, anti-corruption layers, breaking cycles, enforcing
boundaries in CI — live in
[boundaries-and-dependencies.md](./boundaries-and-dependencies.md).

## Plane 2 — Micro: pick a runtime pattern

Match the symptom you actually have. Full cards (intent, modern alternative,
"avoid when", per-domain declensions) in
[runtime-patterns.md](./runtime-patterns.md). For **game** runtime patterns, the
backbone is Robert Nystrom's _Game Programming Patterns_ in [game/](./game/).

| Symptom / problem | Candidate pattern(s) | Reference |
| --- | --- | --- |
| Growing `if/else` choosing *how* to do something | **Strategy** (→ function) | [runtime-patterns.md](./runtime-patterns.md) |
| Need undo/redo, queue, log, or send an action across a process | **Command** (→ closure) | [runtime-patterns.md](./runtime-patterns.md) |
| One part must react to another without hard coupling | **Observer / Pub-Sub** | [runtime-patterns.md](./runtime-patterns.md) |
| Decouple in *time*: buffer, aggregate, cross-thread/process | **Event Queue / Bus** | [runtime-patterns.md](./runtime-patterns.md) |
| 3+ interacting booleans; illegal states reachable | **State machine** | [runtime-patterns.md](./runtime-patterns.md) |
| Expensive + bounded resource churns (connections, threads) | **Object Pool** | [runtime-patterns.md](./runtime-patterns.md) |
| Recomputing expensive derived data eagerly | **Dirty Flag / memoization** | [runtime-patterns.md](./runtime-patterns.md) |
| UI/state must track changing data efficiently | **Reactive state (signals)** | [runtime-patterns.md](./runtime-patterns.md) |
| "Needs global access" temptation | **DI** (not Singleton) | [runtime-patterns.md](./runtime-patterns.md), [boundaries-and-dependencies.md](./boundaries-and-dependencies.md) |
| Read and write shapes diverge; audit/replay needed | **CQRS / Event Sourcing** | [runtime-patterns.md](./runtime-patterns.md), [state-and-data.md](./state-and-data.md) |
| Distributed side effects must be safe to run twice | **Outbox / Saga / Idempotency** | [runtime-patterns.md](./runtime-patterns.md) |
| Game loop, ECS, spatial partition, double buffer, type object | **Game runtime patterns** | [game/](./game/design-patterns-revisited.md) |

## Reference map

| File | Covers |
| --- | --- |
| [macro-structures.md](./macro-structures.md) | Layered, Hexagonal, Onion, Clean, Modular monolith, Microservices, Vertical slice, Event-driven — intent, dependency direction, when to choose/avoid, comparison table, per-domain manifestations, anti-patterns, decision tree |
| [boundaries-and-dependencies.md](./boundaries-and-dependencies.md) | Coupling vs cohesion + connascence, DIP, DI vs Service Locator, Ports & Adapters, Anti-Corruption Layer & bounded contexts, acyclic dependencies & breaking cycles, enforcing boundaries with architecture linters |
| [runtime-patterns.md](./runtime-patterns.md) | Tactical/runtime patterns beyond game-dev: GoF in 2026, Strategy, Command, Observer, Event Queue, State machine, Object Pool, Dirty Flag, Reactive state, DI, plus backend (Outbox/Saga/Idempotency) and desktop (Tauri/Electron IPC) declensions |
| [state-and-data.md](./state-and-data.md) | Single source of truth, derived vs primary state, server vs client state, unidirectional flow, Repository/Unit of Work/DTO, CQRS & Event Sourcing (when it's overkill), optimistic updates & local-first, the "no writable data in two places" rule |
| [cross-cutting.md](./cross-cutting.md) | Error handling (typed vs exceptions, translate at boundaries), logging & observability (structured logs, trace IDs, OpenTelemetry), configuration & secrets, concurrency & cancellation, process boundaries (IPC) & schema versioning, centralizing cross-cutting concerns |
| [principles.md](./principles.md) | SOLID in 2026 + non-OOP, YAGNI/KISS/rule of three, coupling & cohesion as the compass, when a pattern hurts, essential vs accidental complexity, Gall's law, screaming architecture, strategic DDD, decision checklists |
| [game/](./game/design-patterns-revisited.md) | Game runtime patterns (Robert Nystrom, _Game Programming Patterns_): Game Loop, Update Method, Double Buffer, Command, Flyweight, Observer, Prototype, Singleton, State, Bytecode, Subclass Sandbox, Type Object, Component/ECS, Event Queue, Service Locator, Data Locality, Dirty Flag, Object Pool, Spatial Partition, plus cross-cutting game architecture principles |

## Per-domain lens

Patterns manifest differently per domain. Each reference card carries concrete
declensions for the four domains this skill targets:

| Domain | Typical shape | Notes |
| --- | --- | --- |
| **Game** | Engine layer + ECS; runtime loop owns timing | Backbone in [game/](./game/architecture-principles.md); the engine already implements many patterns |
| **Desktop** (Tauri/Electron) | Privileged native core + WebView UI over IPC | The IPC edge is a typed **port**; native core owns the source of truth (a de-facto hexagonal split) |
| **Web/SPA + API** | Components + query cache + small client store; server is authority | Split **server state** (cache) from **client state** (store); the contract is the boundary |
| **Service/backend** | DB as source of truth; domain ← application ← adapters | Repository/Unit of Work; CQRS *without* event sourcing first |

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
- **Patterns are tools, not goals.** The best architecture is the simplest one
  that makes the next change easy. If a pattern doesn't remove real, current pain,
  skip it.

## Workflow when making an architecture decision

```
- [ ] State the problem in one sentence
- [ ] Pick the plane: macro (whole-app shape) or micro (local mechanism)
- [ ] Find the candidate in the matching table
- [ ] Read the card (intent, when to choose, when to avoid, per-domain example)
- [ ] Confirm it's the lightest fix (no simpler structure works)
- [ ] Check dependency direction (inward) and boundaries (no leaks)
- [ ] For optimization/distribution patterns: confirm a real need justifies it
- [ ] Implement; keep coupling low and cohesion high
- [ ] Re-scan with the over-engineering checklist (principles.md)
```

## Source

Game backbone: Robert Nystrom, _Game Programming Patterns_
(https://gameprogrammingpatterns.com/contents.html). The generalist material
synthesizes current (2024–2026) practice on macro structures, module boundaries,
runtime patterns, state management, cross-cutting concerns, and architecture
principles; reference files cite their sources inline.
