# Runtime Patterns

Tactical, micro-plane patterns — how the Nystrom _Game Programming Patterns_
tactics and their GoF equivalents generalize **outside games**.

> For each pattern: intent, when to use, when to avoid, modern alternative, and
> per-domain declensions: **(1) game → Nystrom** (backbone in
> [game/](./game/design-patterns-revisited.md)), **(2) desktop (Tauri/Electron)**,
> **(3) web/SPA**, **(4) service/backend**. Sources (2024–2026) are cited inline.

---

## TL;DR decision table — GoF in 2026

The recurring thesis across 2024-2026 sources: GoF patterns survive as a **shared
vocabulary and mental model**, but many *manual implementations* are now
anti-patterns because the language (or framework) absorbed them. "Code is cheap
now; intent is the expensive part."

| GoF pattern | 2026 status | Replaced / absorbed by |
| --- | --- | --- |
| Iterator | Dead as code | `for..of`, generators, `yield`, `IEnumerable` |
| Prototype | Dead as code | Native clone / structured-clone, spread |
| Template Method | Mostly dead | Higher-order functions, `pipe`/`compose` |
| Strategy | Alive as concept | First-class functions / lambdas |
| Command | Alive | Closures/thunks (simple) · class kept for undo + queue |
| Observer | Alive, reshaped | Events, channels, reactive streams, signals |
| Singleton | Smell | Module-scoped value · DI container |
| Factory Method | Alive | Factory functions · DI containers |
| Decorator | Alive | Function wrapping · annotations · middleware |
| Adapter | Alive | Still hand-written (API wrappers, legacy glue) |
| Proxy | Alive | ES6 `Proxy`, dynamic proxies, sidecars/gateways |
| State | Alive | FSM libs (XState) · `enum`+`switch` for small |
| Visitor | Niche | Pattern matching / `switch` expressions |
| Mediator | Alive, reshaped | Event bus · message broker · store/orchestrator |

Rule of thumb (from the sources): **when a pattern becomes a language feature,
hand-rolling the "pattern" version becomes the anti-pattern.** Reach for a pattern
only when it removes real pain (undo, queueing, cross-process, decoupling at
scale), not "for flexibility we might need someday."

Sources:
- youngju.dev — Design Patterns 2025 Practical Guide (TS/Python/Go): https://www.youngju.dev/blog/culture/2026-03-23-design-patterns-modern-developer-guide-2025.en
- Medium / F. Dordoni — Are the 23 GoF patterns still relevant in 2025?: https://medium.com/@freddy.dordoni/the-gang-of-four-gave-us-23-design-patterns-are-they-still-relevant-in-2025-f2e999c384c0
- Medium / Google Cloud — Design Patterns Are Dead. Long Live Design Patterns. (Jun 2026): https://medium.com/google-cloud/design-patterns-are-dead-long-live-design-patterns-b2c2602fbdc4
- compiler.today — Why Design Patterns Are Overrated (2026): https://www.compiler.today/software-engineering/design-patterns-overrated-pragmatic-simplicity-2026

---

## 1. Strategy — pluggable algorithm

- **Intent** — Select one of several interchangeable algorithms/behaviors at
  runtime behind a single calling interface.
- **When to use** — Payment providers, auth methods, sorting/pricing/discount
  rules, retry policies. Anytime you'd write a growing `if/else` ladder choosing
  *how* to do something.
- **When to avoid** — Only one implementation exists (premature); the "algorithm"
  is a one-liner not worth an indirection.
- **Modern alternative** — A **first-class function / lambda** *is* the strategy.
  Pass a function, or a `Map<key, fn>` registry, instead of a `Strategy`
  interface + N classes. Keep classes only when a strategy needs its own state or
  multiple methods.

```ts
type PricingRule = (cart: Cart) => number;
const rules: Record<string, PricingRule> = {
  standard: c => c.subtotal,
  blackFriday: c => c.subtotal * 0.7,
  vip: c => c.subtotal * 0.85,
};
const total = rules[user.tier](cart);   // no class hierarchy
```

- **Declensions** — *game*: Nystrom folds Strategy into **Type Object** / **State**
  (same delegation shape). *desktop*: swap export/format handlers in the Rust core.
  *web*: pass comparator/validator functions to hooks. *backend*: pluggable
  `PaymentProvider` resolved by DI.
- Source: youngju.dev (Strategy ranked #1 by frequency); compiler.today (Strategy → lambdas).

---

## 2. Command — reify an action as an object

- **Intent** — Turn a request ("delete paragraph", "move shape", "deploy build")
  into a first-class object you can store, queue, log, send across a process, and
  most usefully **undo**.
- **When to use** — You need at least one of: undo/redo; the request must outlive
  the call (queue, log, network hop); many request shapes share one invoker.
- **When to avoid** — None of the above → a direct method call is shorter and
  clearer. Command undo holds object graphs alive as long as the history stack.
- **Modern alternative** — A **closure / thunk** is the lightweight Command. Keep
  a class/object only when you need a paired `execute()` + `undo()`, or readable
  serializable state.

```ts
interface Command { execute(): void; undo(): void; }
class History {
  private undoStack: Command[] = []; private redoStack: Command[] = [];
  run(c: Command) { c.execute(); this.undoStack.push(c); this.redoStack = []; }
  undo() { const c = this.undoStack.pop(); if (c) { c.undo(); this.redoStack.push(c); } }
  redo() { const c = this.redoStack.pop(); if (c) { c.execute(); this.undoStack.push(c); } }
}
```

- **Key insight** — Executing a new command **clears the redo stack** (divergent
  history). Two stacks (undo/redo) is the whole machine.
- **Declensions** — *game*: Nystrom — input remap, replay, AI issuing orders,
  networked input (see [game/design-patterns-revisited.md](./game/design-patterns-revisited.md)). *desktop*: editor
  undo/redo; each `#[tauri::command]` write wraps a reversible op. *web*:
  rich-text/canvas editors, optimistic-UI rollback. *backend*: the "C" in **CQRS**
  is the Command pattern formalized — writes are commands producing events.
- Sources: patterns.dev — Command Pattern: https://www.patterns.dev/vanilla/command-pattern/ · devleader.ca — Command in C# + CQRS link: https://www.devleader.ca/2026/04/14/command-design-pattern-in-c-complete-guide-with-examples

---

## 3. CQRS + Undo via Event Sourcing — Command at architecture scale

- **Intent** — Separate the **write model** (commands → events) from the **read
  model** (queries over purpose-built projections). Undo becomes a compensating
  event or a replay of the stream minus the last event.
- **When to use** — Read and write shapes diverge sharply; you need audit/replay,
  collaborative undo, or independently scaling reads. Single-process apps can use
  the *shape* (write log + in-memory read state) without two databases or a bus.
- **When to avoid** — Adds eventual consistency between write and read; overkill
  when a CRUD row is the whole truth and the UI expects read-after-write instantly.
- **Modern alternative / nuance** — The CQRS "command" is a **DTO of intent** (often
  immutable), distinct from the GoF Command's behavior object; the handler is the
  receiver. Don't conflate them. For local undo, a plain command stack beats event
  sourcing; reach for sourcing when you need history/audit.

```text
Command (intent) ─▶ Command Handler ─▶ Event(s) ─▶ append-only log
                                                     │
                       Projection/Read model ◀───────┘  (rebuild by replay)
Undo = append compensating event  OR  replay stream up to N-1
```

- **Declensions** — *game*: deterministic replay = command/event log. *desktop*:
  Nexus Mods app models app-wide undo via event sourcing (single process, in-memory
  read model). *web*: Redux/Zustand actions are commands; time-travel devtools =
  replay. *backend*: order/loadout lifecycles, sagas with compensation.
- Sources: Nexus Mods — Undo via Event Sourcing: https://nexus-mods.github.io/NexusMods.App/developers/decisions/backend/0011-undo-via-event-sourcing/ · StackOverflow — Command pattern vs CQRS command: https://stackoverflow.com/questions/27408084/confused-about-command-from-the-command-pattern-and-command-in-cqrs · Encore — Event-Driven Architecture in 2026: https://encore.dev/articles/event-driven-architecture

---

## 4. Observer / Pub-Sub — broadcast that something happened

- **Intent** — A subject announces an event without knowing who listens;
  subscribers react. Decouples producers from consumers.
- **When to use** — Cross-cutting reactions to a state change (analytics, audio,
  toasts, cache invalidation); one producer, many consumers; non-parent/child
  component comms in a SPA.
- **When to avoid** — Within one cohesive feature that needs both ends together
  (use explicit calls). Synchronous observers: a slow listener blocks the subject.
  Watch the **lapsed-listener leak** — forgetting to unsubscribe leaks "zombie"
  observers (even under GC). Control flow gets hard to trace statically.
- **Modern alternative** — Function/closure listeners over heavyweight `Observer`
  interfaces. In the browser, **native `EventTarget` + `CustomEvent`** is a
  zero-dependency pub/sub that integrates with DevTools. For streams of changes:
  **reactive (RxJS / signals)**. For async/decoupled delivery → **Event Queue**.

```ts
const bus = new EventTarget();                                   // native pub/sub
bus.addEventListener("order:placed", e => sendEmail((e as CustomEvent).detail));
bus.addEventListener("order:placed", e => updateStock((e as CustomEvent).detail));
bus.dispatchEvent(new CustomEvent("order:placed", { detail: order }));
// Discipline: remove listeners on teardown to avoid the lapsed-listener leak.
```

- **Declensions** — *game*: Nystrom Observer (achievements/audio react to gameplay;
  prefer HAS-A Subject). *desktop*: Tauri **event system** — `app.emit()` in Rust,
  `listen()` in JS for lifecycle/progress. *web*: `EventTarget`, framework events,
  `useEffect` is an implicit observer. *backend*: in-process `EventEmitter`; across
  services → message broker (next card).
- Sources: openreplay — Reactivity Without a Framework (EventTarget): https://blog.openreplay.com/reactivity-without-framework-native-js/ · sitepoint — Designing Event-Driven Frontends: https://www.sitepoint.com/designing-event-driven-frontends/ · Tauri (events): https://v2.tauri.app/develop/state-management/ · Nystrom Observer (see [game/design-patterns-revisited.md](./game/design-patterns-revisited.md)).

---

## 5. Event Queue / Message Bus / Mediator — buffered, async decoupling

- **Intent** — Insert a queue/broker between producers and consumers so events are
  **buffered, ordered, and processed asynchronously**. The bus is a Mediator: a
  central hub routes interactions so components don't reference each other.
- **When to use** — Bursty/real-time event streams; decouple expensive work from
  the request path; fan-out to many independent consumers; smoothing producer/
  consumer rate mismatches; cross-service comms.
- **When to avoid** — Simple synchronous reaction (use Observer). A bus adds
  latency, ordering/at-least-once concerns, and harder debugging ("who consumed
  this?"). Mediator can grow into a god-object if it accretes business logic.
- **Modern alternative** — In-process: `EventEmitter`, an actor mailbox, or a typed
  channel. Distributed: **Kafka / RabbitMQ / Redis Streams / BullMQ**. Modern state
  managers (Redux Toolkit, XState) are event-driven mediators internally.

```text
Producer ─▶ [ queue / topic / bus ] ─▶ Consumer A
                                     └▶ Consumer B   (loose coupling, async)
Mediator variant: components talk to the hub only, never to each other.
```

- **Declensions** — *game*: Nystrom **Event Queue** (decoupled audio, deferred
  events — see [game/decoupling.md](./game/decoupling.md)). *desktop*: Tauri Core process routes **all IPC**
  centrally (a Mediator) — intercept/filter in one place. *web*: SPA event bus for
  toasts/modals; Flux/Redux store as mediator. *backend*: task queues + workers,
  broker-backed microservice events.
- Sources: freecodecamp — Event-Based Architectures in JS: https://www.freecodecamp.org/news/event-based-architectures-in-javascript-a-handbook-for-devs/ · dev.to/hamzakhan — EDA in JS 2025: https://dev.to/hamzakhan/event-driven-architecture-in-javascript-applications-a-2025-deep-dive-4b8g · Tauri process model: https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/concept/process-model.md

---

## 6. State Machine (FSM / Statecharts) — make impossible states impossible

- **Intent** — Model an entity/flow as an explicit set of states + a transition
  table, so only one valid state exists at a time and illegal transitions can't
  happen. Statecharts (Harel) add hierarchy, parallel regions, and history.
- **When to use** — "Boolean soup" where `isLoading`, `hasError`, `isSubmitting`
  interact; multi-step wizards/checkouts; any component with **3+ interacting
  booleans** or `if (isX && !isY && isZ)`.
- **When to avoid** — 2-3 flat states with no guards → a plain `enum` + `switch`
  (or a discriminated union) is clearer and dependency-free. Don't model
  **server-data loading** as a hand-rolled machine — that's React Query/TanStack's
  job. Statecharts add conceptual cost; only adopt them past ~15 states or when you
  need hierarchy/parallelism.
- **Modern alternative / ladder** — escalate only as complexity demands:

```text
2-3 states, no guards .............. enum + switch  (inline, zero deps)
4-10 flat states ................... transition table (Map) or useReducer
per-state behavior/data ............ State pattern (OOP) — GoF
hierarchy / parallel / actors ...... XState v5 (statecharts) ~15-33KB
order/approval lifecycle ........... DB-backed workflow (row = state)
```

```ts
// Transition table — the lightweight FSM core (no library)
type S = "idle" | "loading" | "success" | "error";
type E = "FETCH" | "RESOLVE" | "REJECT" | "RESET";
const table: Record<S, Partial<Record<E, S>>> = {
  idle:    { FETCH: "loading" },
  loading: { RESOLVE: "success", REJECT: "error" },
  success: { RESET: "idle" },
  error:   { FETCH: "loading", RESET: "idle" },
};
const next = (s: S, e: E): S => table[s][e] ?? s;   // unknown event = no-op
```

- **XState v5 nuance (2024 rewrite)** — actor-model core, `setup()` for full TS
  inference, `invoke` instead of `useEffect`+fetch. Tipping point: "hierarchy,
  parallelism, or **more than two invoked effects** → XState pays its cost;
  otherwise `useReducer` is fine and the dependency is decoration."
- **Declensions** — *game*: Nystrom **State** + concurrent/hierarchical/pushdown
  machines; AI moved to behavior trees/GOAP (see [game/design-patterns-revisited.md](./game/design-patterns-revisited.md)).
  *desktop*: app lifecycle / connection state in the Rust core. *web*: XState for
  wizards/forms; `useReducer` for simple flows; Zustand for global UI state.
  *backend*: order/payment/saga lifecycles, protocol handlers.
- Sources: knowledgelib.io — State Machine Implementation (decision tree + table): https://knowledgelib.io/software/patterns/state-machine-implementation/2026 · codewithseb.com — XState + Context patterns: https://www.codewithseb.com/blog/state-machines-react-xstate-patterns-guide · jovanipink.com — XState & the Actor Model: https://jovanipink.com/posts/state-machines-02-xstate-and-the-actor-model · viprasol.com — React State Machines 2026: https://viprasol.com/blog/react-state-machines/

---

## 7. Object Pool — reuse expensive resources, bound a scarce one

- **Intent** — Keep N pre-initialized expensive objects and lend them via
  `borrow()` / `return()` instead of create/destroy per use. Trades memory for
  time; also **caps** consumption of an externally bounded resource.
- **When to use** — Object creation is genuinely expensive **and** the resource is
  bounded: DB connections (TCP+TLS handshake ~300-500ms; Postgres default ~100
  conns), thread pools, GPU framebuffers/contexts, large network buffers.
- **When to avoid** — Cheap objects: on modern runtimes allocation is ~tens of ns,
  escape analysis elides allocs, and GCs make short-lived objects nearly free —
  pooling them just adds bookkeeping and keeps memory alive forever. Unpredictable
  bursts can starve the pool.
- **Modern alternative** — Prefer a **proven library** over hand-rolling (HikariCP,
  PgBouncer, Netty/Tokio pooled buffers) — concurrency bugs and leak detection are
  the hard part. For "many blocking threads", **virtual threads (Java 21+)** /
  async-await often replace thread pools. A **connection pool is just an object
  pool** whose lifecycle adds liveness checks, idle timeout, and reconnect.

```text
borrow():  take from free-list (LIFO keeps hot resources hot); block w/ timeout if empty
return():  validate (socket may have died) → put back, or reap if stale/idle-expired
caps:      hard limit = resource ceiling (DB max_connections − reserve)
failure:   leak (never returned) grows pool → exhaustion → time-out then throw
```

- **Declensions** — *game*: Nystrom **Object Pool** (bullets, particles, FX — avoid
  GC spikes/fragmentation; see [game/optimization.md](./game/optimization.md)). *desktop*: DB/HTTP client pool in
  the Rust core; reuse large buffers. *web*: rarely needed; reuse Web Workers,
  canvas/offscreen buffers, WebGL objects. *backend*: **the** home turf — DB
  connection pools, thread pools, gRPC channels.
- Sources: ikshitij.com — Object Pool (old vs modern table): https://ikshitij.com/learn/lld-concepts/object-pool-pattern/ · ikshitij.com — Connection Pool LLD: https://ikshitij.com/learn/lld-object-oriented/connection-pool-lld/ · io7m/jpuddle (GC contraindication, GPU framebuffers): https://github.com/io7m/jpuddle

---

## 8. Dirty Flag / Memoization / Caching — defer expensive recompute

- **Intent** — Derived data is a cache over primary data. A "dirty" flag is set on
  any primary-data mutation; recompute lazily only when the derived value is read
  and the flag is set, then cache and clear. Trades a boolean check per read for
  skipping computations that may never be needed.
- **When to use** — Derived data is **expensive** and **read less often than its
  inputs change** (or written in bursts then read once): world/transform matrices,
  UI layout, spreadsheet cells, build targets, any costly computed property.
- **When to avoid** — Compute is cheap (flag overhead > recompute), or you read
  after *every* write (flag never saves work, just adds state). The hard part is
  **cache invalidation**: every mutation path must set the flag, or you serve stale
  data.
- **Modern alternative** — Reactive graphs do this automatically: **signals /
  `computed`** (lazy: `set()` marks stale + pushes invalidation downstream; `get()`
  recomputes only if stale), React `useMemo`, Compose `derivedStateOf` (hash-based
  invalidation). Hierarchies: **don't recursively mark children** — pass the
  parent's dirty bit down during traversal (Nystrom's trick).

```ts
class Derived<T> {
  private dirty = true; private cached!: T;
  constructor(private compute: () => T) {}
  invalidate() { this.dirty = true; }          // call on ANY input mutation
  get(): T {
    if (this.dirty) { this.cached = this.compute(); this.dirty = false; }
    return this.cached;                          // else serve cache
  }
}
```

- **Gotcha** — Stale closures: the compute fn must read *current* values at call
  time, not values captured at registration — exactly why `useMemo` needs a deps
  array.
- **Declensions** — *game*: Nystrom **Dirty Flag** (cached world transforms cascade
  parent→child; see [game/optimization.md](./game/optimization.md)). *desktop*: invalidate derived view-model on
  state change; debounce layout. *web*: `useMemo`/`derivedStateOf`/signals,
  memoized selectors (Reselect). *backend*: cache-aside (Redis) with explicit
  invalidation; HTTP `ETag`; incremental/build caches.
- Sources: gameprogrammingpatterns.com — Dirty Flag: https://gameprogrammingpatterns.com/dirty-flag.html · totoro-jam — Dirty Flag (TS skeleton, pitfalls): https://totoro-jam.github.io/battle-tested-patterns/patterns/dirty-flag/ · doveletter.dev — Compose `derivedStateOf` internals: https://doveletter.dev/articles/derived-state-mechanisms · dev.to/luciano0322 — Lazy computed in a reactive graph: https://dev.to/luciano0322/how-computed-values-really-work-lazy-evaluation-in-a-reactive-graph-2mjp

---

## 9. Reactive State — Signals vs Proxy vs Virtual DOM

> Modern generalization of Observer + Dirty Flag for UI. The real difference is
> **who decides whether something recomputes**: data (push) or a diff (pull).

| Mechanism | Dependency tracking | Update model | Best for |
| --- | --- | --- | --- |
| **Signals** | read-time, fine-grained | push, per-computation | high-frequency (cursor, canvas, charts) |
| **Proxy reactivity** | auto via get/set traps | push, object-granular | deep forms / JSON editors (mutate directly) |
| **Virtual DOM** | none — diff snapshots | pull, re-render + diff | React ecosystem, SSR/RSC, team familiarity |

- **When to use which** — Signals/Proxy when fine-grained updates matter or state
  is deeply nested; VDOM when you want React's ecosystem/DX. Hybrid (React +
  signals) for hotspots inside a React app.
- **Native today (no framework)** — `Proxy` for reactive state, `EventTarget` for
  pub/sub, browser observers (`MutationObserver`, `IntersectionObserver`,
  `ResizeObserver`) for DOM/layout reactivity. The **TC39 Signals proposal** aims to
  standardize the State/Computed/Watcher graph.
- Sources: dev.to/luciano0322 — Signals vs Proxy vs Virtual DOM: https://dev.to/luciano0322/signals-vs-proxy-vs-virtual-dom-what-actually-makes-them-different-4b1o · openreplay — Reactivity Without a Framework: https://blog.openreplay.com/reactivity-without-framework-native-js/

---

## 10. Singleton → DI / Service Locator — global access, reconsidered

- **Intent (and why it's a smell)** — Singleton bundles *two* separate promises:
  "one instance" + "global access point." It's global mutable state in a class
  costume: hides dependencies, couples callers, hostile to tests and concurrency.
- **When (rarely) to use** — A class that *must* be single because it fronts
  external global state (filesystem/clock wrapper). Even then, prefer enforcing
  singleness without the global access.
- **When to avoid** — Default. Don't reach for it just for convenient access.
- **Modern alternative (ladder)** — (a) do you need the object at all? (b) **pass
  it in (Dependency Injection)** — explicit, testable; (c) a **module-scoped value**
  (ES modules *are* singletons) or language `object`/`enum`; (d) a narrow
  **Service Locator** only at the composition root when you genuinely need swappable
  global access.
- **Service Locator caveat** — Widely called an **anti-pattern** *as used in
  business logic*: it hides dependencies (empty-looking constructor), turns missing
  deps into runtime (not startup/compile) errors, and forces global setup in every
  test. The accepted line: *"A DI container used as a Service Locator is an
  anti-pattern; a DI container used as a composition root is fine."*

```ts
// Anti-pattern: hidden dependency, fails at runtime, hard to mock
class OrderService { private repo = ServiceLocator.get<Repo>("repo"); }
// Preferred: explicit, compile-checked, trivially testable
class OrderService { constructor(private repo: Repo) {} }
```

- **Declensions** — *game*: Nystrom **Singleton** ("how NOT to use a pattern") +
  **Service Locator** as the swappable lesser-evil (see [game/design-patterns-revisited.md](./game/design-patterns-revisited.md),
  [game/decoupling.md](./game/decoupling.md)). *desktop*: Tauri **`State<T>` Manager API** — register shared
  state (wrap in `Mutex`/`RwLock`) in the Rust core, inject into commands via a
  `State<'_, T>` param = DI, not a global. *web*: module singletons, React context/
  provider, DI in Angular/Nest. *backend*: DI container at the composition root;
  flag `IServiceProvider` use outside factories.
- Sources: deviq.com — Service Locator Pattern (anti-pattern analysis): https://deviq.com/design-patterns/service-locator-pattern/ · ilovedotnet.org — Service Locator anti-pattern: https://ilovedotnet.org/blogs/dependency-injection-service-locator-antipattern-in-dotnet/ · Tauri State Management: https://v2.tauri.app/develop/state-management/

---

## 11. Backend declension — Queues, Workers, Outbox, Saga, Idempotency

> How the tactical patterns above land in a service/backend: the bus becomes a
> broker, Command becomes a job, and "make it safe to run twice" becomes a hard
> requirement.

- **Core premise** — In any distributed system, delivery is **at-least-once**:
  every job *will* eventually run more than once. Don't chase exactly-once at the
  broker — make **consumers idempotent** so a duplicate run changes nothing.
- **Task queue + workers** — Producers publish work (BullMQ, Celery, SQS, Service
  Bus); a worker pool consumes, executes, acknowledges; failures auto-retry into a
  **dead-letter queue** (poison messages). This is Event Queue + Object Pool
  (workers) + Command (the job).
- **Idempotency key** — Carry a unique request/event id; check a `processed_events`
  table (unique constraint) before applying side effects; skip if seen.
- **Transactional Outbox** — You can't atomically update your DB *and* publish to a
  broker. Write the event to an `outbox` table **in the same DB transaction** as
  the business change; a relay (poller or CDC/Debezium) publishes it afterward.
  Guarantees at-least-once publish without 2PC — consumer still must be idempotent.
- **Saga** — Replace distributed transactions: a sequence of local steps, each
  emitting an event; on failure, run **compensating transactions** in reverse
  (refund, release stock). Prefer **orchestration** over choreography past ~3
  services (one place to see state, retry, compensate). Durable-execution engines
  (Temporal, Inngest, Restate) model this directly.

```text
HTTP handler ─tx─▶ [ business row + outbox row ]   (atomic, one DB tx)
                        │
   relay/CDC ───────────┘──▶ broker ──▶ worker (idempotent, dedup by key)
                                          └─ saga step fails ─▶ compensate in reverse
```

- **When to avoid** — Don't layer outbox/CQRS/saga onto a simple CRUD path. "Start
  with Pub/Sub as the primitive; add event sourcing, CQRS, saga, outbox only when
  the system actually needs them." Invest in idempotency, tracing, and DLQs from
  day one — retrofitting after an incident is a recurring tax.
- Sources: digitalapplied.com — Background Jobs & Queues 2026 Reference: https://www.digitalapplied.com/blog/background-job-queue-patterns-2026-engineering-reference · backendbytes.com — EDA in Go: Kafka, Sagas, Outbox: https://backendbytes.com/articles/event-driven-microservices-go-kafka/ · socratopia — Async Processing, Idempotency, Saga: https://www.socratopia.app/library/system-design-en/chapter-15 · Encore — EDA in 2026: https://encore.dev/articles/event-driven-architecture

---

## 12. Desktop declension — Tauri / Electron (Commands + Events + managed State)

> A desktop app is a tiny distributed system: a privileged **core/main process**
> and one or more **WebView/renderer** UI processes, talking over IPC. The same
> three tactical seams recur.

| Concern | Tauri (Rust core) | Electron | Tactical pattern |
| --- | --- | --- | --- |
| Call backend fn from UI | `invoke('cmd', args)` → `#[tauri::command]` | `ipcRenderer.invoke` → `ipcMain.handle` | **Command** |
| Backend → UI notifications | `app.emit()` / `listen()` | `webContents.send` / `ipcRenderer.on` | **Observer / Event Queue** |
| Shared app state | `State<'_, T>` Manager (`Mutex`/`RwLock`) | main-process module / store | **DI** (not Singleton) |
| Central IPC routing | Core routes *all* IPC | main process | **Mediator** |

- **Guidance** — Keep business logic and secrets in the **core** process (smaller
  attack surface, easy cross-window state sync); treat the WebView as untrusted.
  Each IPC command is a reified request (Command); push progress/lifecycle as
  events (Observer). Tauri's managed `State` is constructor-style DI: injected into
  commands, not a global.
- **When to avoid over-engineering** — For local-only UI state, framework state
  (Zustand/signals) in the WebView is enough; don't round-trip every toggle to Rust.
- Sources: Tauri process model: https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/concept/process-model.md · Tauri State Management: https://v2.tauri.app/develop/state-management/ · tech-insider.org — Tauri vs Electron 2026 (IPC mapping): https://tech-insider.org/tauri-vs-electron-2026/

---

## Per-pattern cheat sheet (for an AI agent)

| Pattern | Use when | Avoid when | Modern default |
| --- | --- | --- | --- |
| Strategy | swap algorithm at runtime | one impl | function / `Map<key,fn>` |
| Command | undo, queue, log, cross-process | plain call suffices | closure; class for undo |
| CQRS / Event Sourcing | read≠write, audit, replay | simple CRUD | start Pub/Sub, add later |
| Observer / Pub-Sub | many react to a change | cohesive feature | `EventTarget`, signals |
| Event Queue / Bus | async, buffered, fan-out | sync reaction | EventEmitter / broker |
| State machine | 3+ interacting booleans | 2-3 flat states | enum+switch → useReducer → XState |
| Object Pool | expensive + bounded resource | cheap objects | HikariCP/Netty; virtual threads |
| Dirty Flag / Memo | costly derived, read<write | cheap / read==write | signals, `useMemo`, cache-aside |
| Singleton | almost never | by default | DI; module value |
| Service Locator | composition root only | business logic | constructor DI |
| Outbox / Saga / Idempotency | distributed side effects | single CRUD path | idempotency key + outbox |

## Takeaways

1. **Lead with the symptom, not the pattern name.**
2. **Always reach for the modern/language-native alternative first** — half these
   patterns are now one closure, one `enum`, one `computed`, or DI away.
3. **State the "avoid when" explicitly** — the failure mode is *over-application*,
   not ignorance.
4. **Escalation ladders beat binary choices** — FSM (enum→reducer→XState), pooling
   (don't→library→virtual threads), reactivity (signal→proxy→VDOM).
5. **The four domains share three seams** — a *request* (Command), a *notification*
   (Observer/Event), and *shared state* (DI). Game, desktop, web, and backend just
   rename them.
