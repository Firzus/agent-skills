# Design Patterns Revisited

The classic Gang of Four patterns, re-examined for games. Each card: intent,
problem solved, solution shape, pitfalls, when to avoid, related patterns.

Source: Robert Nystrom, _Game Programming Patterns_ — "Design Patterns
Revisited".

---

## Command

- **Intent** — Reify a method call as an object you can store, pass, queue, and
  replay ("a command is a reified method call").
- **Problem solved** — Decouple _who/when_ an action is invoked from _what_ it
  does: configurable input remapping, driving any actor (player or AI) through
  one interface, undo/redo, replays, networked input.
- **Solution shape**

```cpp
class Command { public: virtual ~Command() {} virtual void execute(GameActor& actor) = 0; };
class JumpCommand : public Command { void execute(GameActor& a) override { a.jump(); } };
// InputHandler returns a Command instead of acting directly;
// a dispatcher runs it on the chosen actor (delayed binding).
```

- **Pitfalls / costs** — Class explosion for one-method behaviors; undo requires
  each command to store the _before_ state (store only what changed, not a full
  Memento); in non-GC languages the executor owns command lifetimes.
- **When to avoid / modern alternative** — In languages with closures /
  first-class functions, a closure (or `std::function`) is the lighter-weight
  Command; keep a class only when you need multiple operations (`execute` +
  `undo`) or explicit readable state. Share stateless commands as Flyweights
  instead of allocating per instance.
- **Related** — Subclass Sandbox, Flyweight (share stateless commands), Event
  Queue (decouple producer/consumer of commands).

---

## Flyweight

- **Intent** — Share one copy of the data common to many objects so you can
  afford thousands of them.
- **Problem solved** — Massive instance counts (a forest of trees, a tile grid)
  blow memory/bus bandwidth when each instance duplicates heavy shared data
  (meshes, textures, terrain properties).
- **Solution shape**

```cpp
class TreeModel { Mesh mesh; Texture bark, leaves; };        // intrinsic (shared)
class Tree { TreeModel* model; Vector pos; float scale; };   // extrinsic (per-instance)
// Terrain: the world is a grid of pointers to a few shared, immutable Terrain objects.
```

- **Pitfalls / costs** — Shared flyweights must be **immutable** (a mutation
  shows up everywhere); pointer indirection can cause cache misses — profile
  first.
- **When to avoid / modern alternative** — Hardware already does this:
  _instanced rendering_ is the GPU-level Flyweight for graphics. For per-instance
  ("extrinsic") data, Data Locality / ECS structure-of-arrays is the modern
  framing; Flyweight targets the _shared_ slice.
- **Related** — Type Object (same split, but models "kinds"), Object Pool,
  State (reuse fieldless state objects).

---

## Observer

- **Intent** — Let a subject broadcast that something happened without knowing
  who is listening.
- **Problem solved** — Cross-cutting features (achievements, audio, UI) react to
  gameplay events without the producing system being coupled to them.
- **Solution shape**

```cpp
struct Observer { virtual void onNotify(const Entity& e, Event ev) = 0; };
class Subject { std::vector<Observer*> obs;
  void addObserver(Observer* o); void removeObserver(Observer* o);
  void notify(const Entity& e, Event ev) { for (auto* o : obs) o->onNotify(e, ev); } };
// Prefer Physics HAS-A "fell" Subject over Physics IS-A Subject.
```

- **Pitfalls / costs** — Synchronous: a slow observer blocks the subject, and
  locks risk deadlock in threaded engines; the **lapsed-listener problem**
  (forgetting to unregister leaks "zombie" observers, even under GC); control
  flow is harder to follow statically.
- **When to avoid / modern alternative** — Don't use it _within_ one cohesive
  feature where you need both ends together (use explicit calls). For
  async/threaded/queued delivery, use an **Event Queue**. Modern style:
  function/closure listeners (C# `event`/delegates, JS callbacks) over
  heavyweight `Observer` interfaces; data binding for "mirror state to UI".
- **Related** — Event Queue (async sibling), Chain of Responsibility.

---

## Prototype

- **Intent** — An object can spawn new objects similar to itself (clone class
  and state).
- **Problem solved** — Avoid a parallel spawner-class hierarchy (one `Spawner`
  per `Monster` subclass); let one spawner stamp out copies of a template.
- **Solution shape**

```cpp
class Monster { public: virtual Monster* clone() = 0; };
class Ghost : public Monster { Monster* clone() override { return new Ghost(health_, speed_); } };
class Spawner { Monster* prototype_; public: Monster* spawn() { return prototype_->clone(); } };
```

- **Pitfalls / costs** — Still must hand-write `clone()` per class; deep-vs-
  shallow clone semantics are a rathole; the premise assumes a per-monster class
  hierarchy, which modern engines avoid.
- **When to avoid / modern alternative** — Nystrom never found a case where the
  Prototype _design pattern_ was the best answer. Use spawn functions, function
  pointers, generics, or first-class types. The valuable form is **prototypal
  data modeling**: data definitions with a `"prototype"` field that delegates
  missing properties (great for boss/unique-item variants).
- **Related** — Type Object & Component (preferred for entity kinds), Factory.

---

## Singleton

> Nystrom's "how NOT to use a pattern" chapter. Treat with suspicion.

- **Intent** — Ensure one instance and provide a global access point — note this
  bundles _two_ separable promises.
- **Problem solved** — Legitimately: a class that _must_ be single because it
  fronts external global state (e.g. a filesystem wrapper). Usually misused just
  for convenient global access.
- **Solution shape**

```cpp
class FileSystem {
public:
  static FileSystem& instance() { static FileSystem inst; return inst; } // C++11 thread-safe
  FileSystem(const FileSystem&) = delete;
};
```

- **Pitfalls / costs** — It is global mutable state in a class costume:
  encourages coupling, hides dependencies, not concurrency-friendly; solves two
  problems even when you have one; lazy init takes timing/memory-layout control
  away (bad for games).
- **When to avoid / modern alternative** — Avoid by default. In order of
  preference: (a) see if you need the class at all; (b) **pass it in**
  (dependency injection); (c) get it from a base class (Subclass Sandbox); (d)
  piggyback on one existing global like `Game`/`World`; (e) **Service Locator**
  when you genuinely need global access but want it swappable. To enforce single-
  instance _without_ global access, use a runtime `assert` on a static flag.
- **Related** — Service Locator, Subclass Sandbox.

---

## State

- **Intent** — Let an object change behavior by changing the state object it
  delegates to (formalizes a finite state machine).
- **Problem solved** — Tangled boolean flags + branching for entity behavior
  (jump/duck/dive bugs); an FSM enforces exactly one valid state at a time.
- **Solution shape**

```cpp
struct HeroineState { virtual HeroineState* handleInput(Heroine& h, Input i) = 0;
                      virtual void update(Heroine& h) = 0; virtual void enter(Heroine& h) {} };
class DuckingState : public HeroineState { int chargeTime_; /* state-specific data */ };
// Heroine holds state_*, delegates handleInput/update; transition = reassign state_.
```

- **Pitfalls / costs** — Static (fieldless) states save allocations but can't
  hold per-machine data; instantiated states need careful delete-on-transition
  (don't `delete this`); FSMs aren't Turing-complete and hit a wall on complex
  behavior.
- **When to avoid / modern alternative** — For combinatorial blow-up (`n×m`),
  use **concurrent state machines** (separate FSMs → `n+m`). For shared behavior,
  **hierarchical state machines** (superstates). For "return to previous state",
  **pushdown automata** (a stack of states). For real game **AI**, the field
  moved to **behavior trees** and **planners (GOAP)** — use those. A plain
  `enum` + `switch` is fine for simple cases; don't reach for classes early.
- **Related** — Flyweight (share fieldless states), Strategy & Type Object
  (same delegation shape), Object Pool, Update Method.
