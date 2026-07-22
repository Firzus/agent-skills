# Decoupling Patterns

Patterns that break dependencies between parts of the game so each can change
independently.

Source: Robert Nystrom, _Game Programming Patterns_ — "Decoupling Patterns".

---

## Component

- **Intent** — Allow a single entity to span multiple domains without coupling
  those domains to each other.
- **Problem solved** — A monolithic `GameObject`/`Player` accumulates physics,
  rendering, input, and AI in one place — the "blob" anti-pattern. Domains get
  tangled and reuse across entity types becomes impossible.
- **Solution shape**

```cpp
class GameObject { std::vector<Component*> components_; };
struct PhysicsComponent : Component { void update(World&); };
struct RenderComponent  : Component { void render(Graphics&); };
// Entity = container; behavior lives in pluggable components.
```

Favor **composition over inheritance**: an entity _is a bag of components_; each
component owns one domain; they communicate narrowly (messages, shared state, or
container mediation).

- **Pitfalls / costs** — Inter-component communication is the hard part (direct
  refs vs messaging vs shared container — each trades off differently); more
  indirection and allocation; debugging spans multiple objects; components can
  end up implicitly coupled anyway.
- **When to avoid / modern alternative** — Overkill for simple entities or small
  games where one class suffices. The major evolution is **ECS** (see
  [architecture-principles.md](./architecture-principles.md)) — when you have
  many entities and care about cache performance, go data-oriented rather than
  keeping components as scattered heap objects.
- **Related** — Strategy & State (components are often strategy-like), Type
  Object (data-define the component makeup), Service Locator, Observer/Event
  Queue (component communication).

---

## Event Queue

- **Intent** — Decouple _when_ a message or event is sent from _when_ it's
  processed.
- **Problem solved** — Direct synchronous calls (or plain Observer) force the
  sender to wait and run handler code immediately, on the sender's thread/frame.
  This causes ordering problems, redundant work (the same sound played 10× in
  one frame), and tight temporal coupling.
- **Solution shape**

```cpp
void send(Event e) { queue_[tail_++] = e; }          // ring buffer of pending events
void update() {                                       // processed later, in a controlled phase
  while (head_ != tail_) { handle(queue_[head_]); head_ = (head_ + 1) % MAX; }
}
```

Producers enqueue; a consumer drains the queue at a chosen time/phase. A ring
buffer keeps memory fixed.

- **Pitfalls / costs** — The most complex messaging pattern; introduces latency
  and makes control flow non-obvious ("who handles this, and when?"); state can
  change between send and handle (events may reference stale data); risk of
  feedback loops (handling an event posts more events); harder to debug than
  direct calls.
- **When to avoid / modern alternative** — Don't reach for it when a direct call
  or synchronous **Observer** suffices — use it only when you must decouple in
  _time_ (buffering, aggregation, cross-thread/frame). Modern variants:
  **message/event bus**, **command buffers** (deferred rendering / ECS), async
  message queues. Beware turning everything into "event soup".
- **Related** — Observer (synchronous sibling), Command (events are often
  reified commands), Singleton (often a global queue — watch the downsides),
  State.

---

## Service Locator

- **Intent** — Provide a global point of access to a service without coupling
  users to the concrete class that provides it.
- **Problem solved** — Cross-cutting systems (audio, logging, input) are needed
  everywhere. Passing them through every constructor is tedious; hardcoding a
  concrete class (or Singleton) bolts you to one implementation and platform.
- **Solution shape**

```cpp
class Locator {
  static Audio* service_;
public:
  static Audio& getAudio() { return *service_; }   // returns an abstract interface
  static void provide(Audio* s) { service_ = s; }  // swap implementations at startup
};
```

A **null service** (no-op implementation) handles the "not provided yet" case
safely.

- **Pitfalls / costs** — Essentially a **global with extra steps**: dependencies
  become _hidden_ (a class's needs aren't visible in its signature),
  order-of-initialization bugs appear, and testing/parallelism suffer from
  shared global state; runtime errors if a service isn't registered.
- **When to avoid / modern alternative** — Prefer **dependency injection** (pass
  services explicitly) — it makes dependencies visible, testable, and mockable,
  which is the central modern critique of Service Locator. Reserve the locator
  for truly ubiquitous, single-instance, engine-level systems. Use a **null
  object** plus scoped/decorator services to keep it safe (e.g. a logging
  decorator).
- **Related** — Singleton (the heavier alternative it improves on), Null Object,
  Facade, Dependency Injection (the modern counterpoint).
