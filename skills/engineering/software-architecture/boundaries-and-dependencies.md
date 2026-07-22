# Boundaries & Dependencies

Stack-agnostic principles, decision heuristics, and enforcement mechanisms to
design and defend healthy module boundaries.

> Maximize cohesion *inside* a module; minimize coupling *across* modules.
> Coupling that crosses an encapsulation boundary is the expensive kind; coupling
> contained inside one module is just cohesion.

---

## 1. Coupling vs cohesion

### Types of coupling (worst → best)

| Type | Description | Severity |
| --- | --- | --- |
| Content | A module reaches into another's internals (e.g. reflection on a private field) | Worst |
| Common / Global | Modules share mutable global state | Very high |
| External | Shared dependency on an external format/protocol/device | High |
| Control | One module drives another's flow via a flag | Medium |
| Stamp | Passing a structure when only part is used | Medium |
| Data | Passing explicit scalar parameters | Low (target) |

### Connascence (Page-Jones) — a finer vocabulary than "coupling"

Two components are *connascent* if changing one forces a change in the other to
preserve correctness. Three dimensions: **strength** (how hard to refactor),
**locality** (how close in the code), **degree** (how many components affected).

```
Static (visible at compile time, weaker):
  Name  <  Type  <  Meaning  <  Position  <  Algorithm
Dynamic (visible at runtime, stronger):
  Execution  <  Timing  <  Value  <  Identity
```

> Even the weakest dynamic connascence is stronger than the strongest static one
> (runtime bugs are harder to find and fix).

**Three action rules** (Page-Jones):
1. Minimize overall connascence by breaking the system into encapsulated elements.
2. Minimize connascence that **crosses** encapsulation boundaries.
3. Maximize connascence **within** a boundary (= cohesion).

**Refactor heuristic:** convert strong/implicit connascence into a weaker/explicit
form (e.g. *Meaning → Name* by replacing a magic number with a named constant;
*Position → Name* by moving from positional args to named parameters/an object).

Sources: https://en.wikipedia.org/wiki/Connascence · https://coupling.dev/posts/related-topics/connascence/ · https://andyhansen.co.nz/posts/understanding-coupling-with-connascence

---

## 2. Dependency inversion & injection

### Dependency Inversion Principle (DIP)
High-level modules (business policy) must not depend on low-level modules
(details); both depend on **abstractions**. The abstraction (the port/interface)
is **owned by the core**; the implementation lives outside. This is also the #1
strategy for breaking a cycle (see §5).

### DI vs Service Locator

| Criterion | Constructor Injection (DI) | Service Locator |
| --- | --- | --- |
| Dependency visibility | Explicit in the signature | **Hidden** in the body |
| Missing-dependency detection | Compile-time / at startup (composition root) | **Runtime**, deep in a call |
| Testability | Direct substitution of test doubles, no container needed | Must configure/reset a global registry per test |
| Coupling | To the injected abstraction | To the locator (static cling) |

**Modern critique of Service Locator:** it violates the *Explicit Dependencies
Principle* and encapsulation; a parameterless constructor "lies" about what the
class needs. The static registry introduces hidden test-order coupling and breaks
parallel test runs. Consensus verdict: **anti-pattern** *as used in business
logic*.

> Pragmatic nuance: a DI container used **at the composition root** is healthy;
> the same container used *as* a Service Locator in the core is the anti-pattern.

```csharp
// ANTI: hidden dependency, runtime failure
public OrderService() { _repo = ServiceLocator.Get<IOrderRepository>(); }

// OK: explicit contract, startup failure, testable without a container
public OrderService(IOrderRepository repo) { _repo = repo; }
```

Sources: https://deviq.com/antipatterns/service-locator/ · https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/

---

## 3. Ports & Adapters — concretely

The core (domain + use cases) knows **only ports** (interfaces). Dependency arrows
always point **inward**; the core never imports an adapter.

| | Inbound / Driving / Primary | Outbound / Driven / Secondary |
| --- | --- | --- |
| The port is… | **exposed** by the core (a use case) | **defined** by the core, **implemented** outside |
| Who calls whom | the adapter calls the port | the core calls the port |
| Port examples | `PlaceOrderUseCase`, `SendMoneyUseCase` | `OrderRepository`, `PaymentProcessor` |
| Adapter examples | REST controller, CLI, queue consumer, test | Postgres repo, SMTP client, external HTTP client |

**How to define a port:** express an *intent* with no technology. "store a user" →
`UserRepository`. "register a user" → `RegisterUser` use case. An adapter knows
*only one thing* about the outside world.

**Composition root:** the single place that knows the concrete implementations; it
wires adapters↔ports at startup.

```
domain/         entities, value objects, domain services   -> depends on NOTHING
application/    use cases, port.in/, port.out/             -> depends on domain
adapter.in/     web, cli (inbound adapters)                -> depends on application
adapter.out/    persistence, messaging (outbound adapters) -> depends on application + domain
```

Sources: https://www.thoughtworks.com/insights/blog/architecture/hexagonal-architecture-explained-practical-example · https://blog.ndepend.com/hexagonal-architecture/

---

## 4. Anti-Corruption Layer, bounded contexts (DDD)

- **Bounded context:** the area where one model (and its *ubiquitous language*) is
  consistent. A **module** is the materialization of a bounded context — "not just
  a folder".
- **Context relations:** Upstream/Downstream (upstream imposes, downstream adapts),
  Shared Kernel (small co-owned core), Anti-Corruption Layer.

### Anti-Corruption Layer (ACL)
A **defensive translation** layer between two contexts/systems that don't share
semantics. It stops the upstream (or a legacy/third-party) model from **leaking
and corrupting** the downstream model. Built from Facade + Adapter that map
foreign types to domain types. Usual implementation: a **port** on the downstream
domain side + an **adapter** on the infra side that translates.

```
Context A (pure domain) --port--> [ ACL: translate(A.Model <-> B.Dto) ] --> System B (legacy/3rd-party)
```

**When to use:** conformist / customer-supplier / open-host relationships where the
downstream refuses leakage. A *core* subdomain should almost never depend on a
generic upstream **without** an ACL. It's the strategic opposite of a Shared
Kernel (separate by translation vs merge by co-ownership).

Sources: https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer · https://deviq.com/domain-driven-design/anti-corruption-layer/

---

## 5. Acyclic dependencies & breaking cycles

### Acyclic Dependencies Principle (ADP)
The dependency graph between packages/components **must be a DAG** (no cycles). A
cycle makes the app impossible to stabilize (a change in one node forces changes
in all others in the cycle), blocks isolated testing/reuse, and can trap a naive
build in infinite rebuilds.

**3 strategies to break a cycle:**
1. **Invert** the dependency via an interface/abstraction (DIP) — one defines the
   port, the other implements it.
2. **Extract** the shared concept into a 3rd module both depend on.
3. **Merge** the modules if they're really one concept artificially split (an
   underused option). *(Lazy-import / setter-injection palliatives hide the defect
   — prefer a real refactor.)*

### Stable Dependencies Principle (SDP)
"Depend in the direction of stability": parts that change often depend on parts
that change rarely, not the reverse. Instability `I = fan-out / (fan-in + fan-out)
∈ [0,1]`; `I=0` = maximally stable. A dependency should always go toward a lower
`I`. *Classic trap:* a catch-all `utils` package, assumed stable but constantly
edited — an SDP anti-pattern.

Sources: https://en.wikipedia.org/wiki/Acyclic_dependencies_principle · https://www.repotoire.com/blog/circular-dependencies-guide

---

## 6. Enforcing boundaries (architecture-as-code)

Encode the architecture's "routing table" as **executable rules in CI**, turning
intent into a fitness function that blocks drift at PR time. Rollout: start in
**warn**, freeze a baseline, then move to **error**.

| Ecosystem | Tool | Role |
| --- | --- | --- |
| JS/TS (IDE) | `eslint-plugin-boundaries` | real-time feedback on cross-layer imports |
| JS/TS (CI) | `dependency-cruiser` | global analysis, cycles, forbidden rules |
| JS/TS | `madge --circular` | fast cycle detection (pre-commit) |
| Java | `ArchUnit` | architecture rules as unit tests (layered/onion) |
| Python | `import-linter` | `layers`/`forbidden`/`independence` contracts |
| Rust | workspace crates + `pub(crate)` | boundaries enforced by the compiler |

```js
// dependency-cruiser: domain purity + no cycles
forbidden: [
  { name: "domain-purity", severity: "error",
    from: { path: "src/.*/domain" }, to: { path: "src/.*/(data|infra|presentation)" } },
  { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
]
```

Sources: https://github.com/javierbrea/eslint-plugin-boundaries · https://www.baeldung.com/java-archunit-intro · https://import-linter.readthedocs.io/en/stable/contract_types/layers/

---

## 7. Per-domain declensions

### Game — ECS (systems / components)
Boundary = **data vs behavior**. *Entity* = ID. *Component* = pure data, **zero
behavior**. *System* = pure behavior that queries entities having a component set.
The boundary holds because systems declare their accesses (read/write) explicitly,
enabling parallelism and cache locality. Composition > inheritance: add a feature =
add a component, don't subclass.

```rust
struct Position { x: f32, y: f32 }   // component = data only
struct Velocity { dx: f32, dy: f32 }
fn movement(q: Query<(&mut Position, &Velocity)>) {  // system = behavior only
    for (mut p, v) in q { p.x += v.dx; p.y += v.dy; } // touches ONLY what it queries
}
```
Trap: a component holding logic (a method mutating another system) re-couples
data↔behavior and kills parallelization.

### Desktop (Tauri/Electron) — the IPC boundary (JS ↔ native)
The most dangerous boundary: serialized, dynamic, untyped by default → *Type*/
*Meaning* connascence that only leaks at runtime. **Rule:** the IPC boundary is a
**port**. The Rust backend exposes `#[tauri::command]` (inbound adapters); the
frontend never touches native except via **generated typed bindings**.

Typed solution (Tauri v2): `specta` + `tauri-specta` generate a `bindings.ts` from
annotated commands → end-to-end type safety; Rust types are the source of truth.

```ts
import { commands } from "./bindings";  // generated, typed
await commands.greet("Brendan");        // compile error if the Rust signature changes
```
Traps: passing opaque `serde_json::Value` (type loss); hand-duplicating TS types
(Type connascence that silently drifts); putting business logic in the command
(the adapter must stay thin and delegate to a use case).

### Web front + API
The network boundary is a contract. Make the contract the **single source of
truth** and generate the rest: **tRPC** (mono-repo TS) shares the `AppRouter` type,
typed client without codegen; **OpenAPI** (poly-language) generates typed clients
for any language. Trap: letting the front import the back's entities/ORM (infra
leak) instead of DTOs/contract types.

### Service/backend (repositories, gateways)
- **Repository** = outbound port defined by the domain for persistence;
  implementation (SQL, ORM) lives in infra. The domain never knows
  `sqlx`/`JPA`/`Prisma`.
- **Gateway** = outbound port to an external system (payment, mail, other
  service); often paired with an **ACL** when external semantics differ.
- Dependency direction: `presentation → application → domain`; `infra →
  application/domain`; **never** `domain → infra`.

---

## 8. Traps (boundaries that leak silently)

| Trap | Symptom | Fix |
| --- | --- | --- |
| **Mutable global / singleton** | "spooky action at a distance"; order-dependent tests; data races; dependency absent from signatures | Explicit DI; no mutable `static`; singleton = container-managed, request-scoped |
| **Ambient context in the domain** | a method secretly reads `Current.user`/`HttpContext` | Confine ambient context to *metadata* (logging, request_id), never business decisions; inject a scoped `CurrentUser` |
| **Infra types leaking into the domain** | ORM entity, `HttpRequest`, DB DTO, SQL exception cross the boundary | Domain DTOs/value objects; map in the adapter; lint rule `domain ↛ infra` |
| **Service Locator in disguise** | container injected then used as a registry in the core | Constructor injection; container confined to the composition root |
| **Implicit dependencies** (protocol, order, bus) | invisible coupling not caught by static analysis | Prefer explicit dependencies; make order/contract visible and typed |

---

## 9. Agent checklist

1. **Identify the boundary:** bounded context (DDD), layer (layered), or technical
   edge (IPC/network)? Name upstream/downstream.
2. **Define the port on the core side** (intent, not tech). Inbound = exposed use
   case; outbound = defined need, implemented outside.
3. **Check dependency direction:** everything points inward / toward the more
   stable (SDP). No `domain → infra` arrow.
4. **Guarantee acyclicity** (ADP): on a cycle → invert (DIP) / extract a module /
   merge.
5. **Translate at the boundary** (ACL) if models differ; never let a foreign or
   infra type leak.
6. **Type serialized edges** (IPC/network) with bindings/contracts generated from a
   single source of truth.
7. **Ban mutable global state;** inject explicitly via the constructor.
8. **Encode rules in CI** (eslint-boundaries / dependency-cruiser / ArchUnit /
   import-linter / Rust crates); warn → baseline → error.
