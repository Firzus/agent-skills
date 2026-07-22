# Macro Structures

How to decompose a whole application and which way its dependencies point. Pick
the **simplest structure the problem permits** — Clean on a CRUD app is
over-engineering; an unstructured mud-ball on a long-lived domain is debt.

Source: synthesis of current (2024–2026) practice — Cockburn (Hexagonal),
Palermo (Onion), Martin (Clean), Fowler/Thoughtworks, plus the consensus that
Hexagonal/Onion/Clean are **one idea** (dependencies point inward) seen from
different angles.

---

## The decision in one axis

Layered, Hexagonal, Onion, and Clean are not four rival philosophies — they sit
on a single axis: **which way do dependencies point?**

```
Big Ball of Mud → Layered (top-down) → Hexagonal → Onion → Clean → Modular
   (no rules)      (Pres→Biz→Data)     (ports)    (domain core, deps point INWARD)
```

The single inversion — making infrastructure depend on the domain instead of the
domain depending on infrastructure — is what turns N-tier into
Hexagonal/Onion/Clean. Everything else (number of rings, naming) is detail.

Two orthogonal axes the structures don't decide:
- **Microservices** is a *deployment* topology (many processes/DBs), orthogonal
  to the above — you can have a Clean monolith or N-tier microservices.
- **Vertical slice** and **event-driven** are *organizing* axes that cut across
  any of them.

---

## The structures

### Layered / N-tier
- **Intent** — Split horizontally: Presentation → Business → Data. Dependencies
  flow top-down; the business layer ends up depending (transitively) on the DB.
- **Choose when** — Simple CRUD, thin business rules, prototype/MVP, small team,
  fast delivery prioritized.
- **Avoid when** — Rich domain rules, long-lived product, need to swap infra or
  unit-test business logic without a DB.
- **Cost** — Low ceremony; weak domain isolation; business logic couples to data.

### Hexagonal (Ports & Adapters)
- **Intent** — The application core sits in the center and knows only **ports**
  (interfaces it defines). **Adapters** implement those ports for specific tech
  (HTTP, SQL, queues). All arrows point inward.
- **Choose when** — Business rules matter and infrastructure will change (swap DB,
  add a CLI, support a message queue), or you need multi-channel access and strong
  testability.
- **Avoid when** — Thin CRUD where the ceremony (interfaces, mappers) outweighs
  the benefit.
- **Cost** — Medium; interfaces + adapters + a composition root to wire them.

### Onion
- **Intent** — Concentric rings (domain model → domain services → application →
  outer infra); dependencies point inward; the domain is at the center.
- **Choose when** — Same as Hexagonal, with an explicit domain-centric layering.
- **Avoid when** — Same as Hexagonal.
- **Cost** — Medium; effectively Hexagonal with prescribed rings.

### Clean
- **Intent** — Onion + an explicit **Use Cases** ring (Jacobson's BCE): Entities
  (enterprise rules) at the center, Use Cases (application rules) around them,
  Interface Adapters, then Frameworks & Drivers. The **Dependency Rule**:
  dependencies only point inward.
- **Choose when** — Long-lived application where new use cases are continually
  added on top of stable entities, and intent must stay legible as it grows.
- **Avoid when** — CRUD, prototypes, short-term or solo projects — the overhead
  (interfaces, mappers, DTOs) is pure tax.
- **Cost** — High; the most ceremony of the inward-pointing family.

### Modular monolith
- **Intent** — One deployable, but partitioned into modules with **hard internal
  seams** (each module = a bounded context, talking via explicit interfaces/events).
- **Choose when** — You want microservice-like boundaries without the distributed
  systems tax; a likely starting point that can later split into services.
- **Avoid when** — The app is small enough that modules add ceremony, or you
  genuinely need independent deploy/scale now.
- **Cost** — Medium; discipline to keep modules from importing each other's guts
  (enforce with architecture linters — see
  [boundaries-and-dependencies.md](./boundaries-and-dependencies.md)).

### Microservices
- **Intent** — Independent deployables, each owning its data, communicating over
  the network.
- **Choose when** — Real need for independent scaling/deployment and team
  autonomy, with the ops maturity (CI/CD, observability, distributed debugging) to
  pay for it.
- **Avoid when** — Early product, single team, unclear boundaries. Splitting too
  early yields a **distributed monolith** — all the network pain, none of the
  independence.
- **Cost** — Very high; network failure modes, eventual consistency, deployment
  and observability overhead. Start with a modular monolith and extract.

### Vertical slice
- **Intent** — Organize by **feature** (`orders/`, `payments/`) end-to-end rather
  than by technical layer (`controllers/`, `services/`). High cohesion per slice.
- **Choose when** — Feature teams; you want changes localized to one folder; pairs
  well with screaming architecture (see [principles.md](./principles.md)).
- **Avoid when** — Heavy shared domain logic that would be duplicated across
  slices (extract a shared core).
- **Cost** — Low–medium; watch for cross-slice duplication.

### Event-driven
- **Intent** — Components communicate by emitting/reacting to **events** rather
  than direct calls; producers don't know consumers.
- **Choose when** — Async workflows, fan-out to independent consumers, decoupling
  in time, integration across services.
- **Avoid when** — A synchronous call is clearer; "event soup" makes control flow
  invisible and debugging hard. See Event Queue in
  [runtime-patterns.md](./runtime-patterns.md).
- **Cost** — High operational complexity (ordering, at-least-once, idempotency).

---

## Comparison

| Structure | Dependency direction | Complexity | Domain isolation | Testability | Best for |
| --- | --- | --- | --- | --- | --- |
| Layered / N-tier | top-down | Low | Weak | Medium | Simple CRUD, MVPs |
| Hexagonal | inward (ports) | Medium | Strong | High | Multi-channel, swappable infra |
| Onion | inward (rings) | Medium | Strong | High | Domain-centric apps |
| Clean | inward (Dep. Rule) | High | Strong | Excellent | Long-lived, use-case-rich domains |
| Modular monolith | inward per module | Medium | Strong (per module) | High | Microservice seams, one deploy |
| Microservices | network contracts | Very high | Strong (per service) | High | Independent scale/deploy |
| Vertical slice | per feature | Low–Med | Per slice | High | Feature teams |
| Event-driven | via events | High | Decoupled | Medium | Async, fan-out, integration |

---

## Per-domain manifestation

- **Game** — The engine is effectively layered (platform → engine → gameplay);
  ECS is a data-oriented structure inside the gameplay layer (see
  [game/architecture-principles.md](./game/architecture-principles.md)). Don't
  re-implement what the engine's loop/scene graph already gives you.
- **Desktop (Tauri/Electron)** — A privileged **native core** process and one or
  more **WebView** UI processes over IPC is **hexagonal by construction**: the
  core owns the domain + source of truth and exposes ports (commands); the Webview
  is a driving adapter. Keep business logic and secrets in the core.
- **Web/SPA + API** — Front end: components + a query cache + a small client
  store. Back end: layered for simple APIs, hexagonal/clean when the domain earns
  it. The network contract is the boundary; don't leak ORM entities to the client.
- **Service/backend** — Start as a **modular monolith** with clean inward
  dependencies (domain ← application ← adapters); extract microservices only when a
  module needs independent scale/deploy.

---

## Anti-patterns

| Anti-pattern | Symptom | Fix |
| --- | --- | --- |
| **Big Ball of Mud** | No discernible structure; every change ripples everywhere | Introduce one boundary at a time where pain is real |
| **Distributed monolith** | Microservices that must deploy together, chatty sync calls | Merge back to a modular monolith; split only on real seams |
| **Premature microservices** | Splitting before boundaries are understood | Modular monolith first; extract when forced |
| **Over-engineered CRUD** | Clean/hexagonal ceremony on a data-moving app | Drop to layered; delete speculative ports |
| **Lasagna** (too many layers) | A GET passes through 5+ pass-through layers | Collapse layers that only forward |
| **Event soup** | Async events everywhere; no traceable control flow | Use sync calls where cohesive; reserve events for real decoupling |

---

## Decision tree

```
Is there real, non-trivial business logic (rules, invariants, workflows)?
├─ No  → Layered / N-tier. Stop. (Add a query cache for remote data.)
└─ Yes → Will infrastructure or delivery channels change (DB, CLI, queue, UI)?
         ├─ No, and the app is short-lived       → Layered, kept tidy.
         └─ Yes / long-lived:
              Few use cases, stable surface       → Hexagonal (ports & adapters).
              Many use cases on stable entities    → Clean (add the use-case ring).
              Want hard module seams, one deploy   → Modular monolith.
              Genuine independent scale/deploy +    → Microservices
                ops maturity                          (start modular, then extract).
Organize the chosen structure by FEATURE (vertical slice) so the tree screams
the domain, not the framework. Add EVENT-DRIVEN edges only where async
decoupling is a real requirement.
```

> Reassess as the system grows (Gall's law: complex systems that work evolve from
> simple systems that worked — see [principles.md](./principles.md)). You can move
> Layered → Hexagonal → Clean incrementally; you rarely need the end-state on day
> one.

### Sources
- Layered/Hexagonal/Clean comparison: https://calmops.com/software-engineering/software-architecture-patterns/
- Clean/Hexagonal/Onion guide (2025): https://www.youngju.dev/blog/culture/2026-04-14-clean-architecture-hexagonal-onion-ports-adapters-guide-2025.en
- Hexagonal/Clean/N-layered: https://soren-learning.site/technical/hexagonal-clean-and-n-layered-architecture
- Demystifying patterns (Thoughtworks): https://www.thoughtworks.com/en-us/insights/blog/architecture/demystify-software-architecture-patterns
- Clean vs Hexagonal vs Onion vs N-tier: https://prepstack.co.in/interview/system-design/clean-architecture-vs-hexagonal-vs-onion-vs-ntier
