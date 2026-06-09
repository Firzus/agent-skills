# Architecture Principles

Cross-cutting guidance that ties the individual patterns together. Read this to
decide _how hard_ to architect and _when a pattern hurts_.

Source: synthesis of Robert Nystrom, _Game Programming Patterns_ (esp. the
"Architecture, Performance, and Games" intro) + widely-accepted modern practice.

---

## The central trade-off: decoupling vs. simplicity vs. speed

Nystrom frames the whole book around three forces in tension:

- **Decoupling** makes change easy (you can touch one part without breaking
  others) — but every layer of indirection is code to write, read, and debug.
- **Simplicity** is the default you should fight to keep. The best architecture
  is the _least_ structure that still makes the next change easy.
- **Speed/memory** sometimes demands you _re-couple_ data and sacrifice
  abstraction (see [optimization.md](./optimization.md)).

Practical stance: **prototype loosely, then harden.** During exploration, write
direct, simple code. Add a pattern only when you feel real pain (a change is
hard, a system is tangled, a profiler flags a hot loop). Don't pre-build
abstraction for change that may never come.

---

## The decoupling spectrum (sender → receiver)

Pick the lightest mechanism that removes the coupling you actually have:

```
direct call  →  Command (reified call)  →  Observer (sync broadcast)  →  Event Queue (async, buffered)
```

- **Direct call** — within one cohesive feature; you want both ends visible.
- **Command** — when _who_ or _when_ should be configurable (input remap, AI,
  undo, replay, network).
- **Observer** — one-to-many reaction _now_, same frame, same thread.
- **Event Queue** — when you must decouple in _time_ (buffering, aggregation,
  cross-thread/frame). Costs latency and debuggability — don't default to it.

---

## The behavior-modeling ladder

Escalate only as complexity demands:

```
flags / switch  →  State (FSM)  →  concurrent + hierarchical FSM  →  pushdown automata  →  behavior trees / planners (GOAP)
```

A plain `enum` + `switch` is the right first answer. Reach for the State pattern
when flag combinations cause bugs; reach for behavior trees / planners for real
AI. Don't jump straight to the heavy machinery.

---

## The globals problem

Global mutable state is the most common source of hidden coupling in game code.
Order of preference when something "needs to be reachable everywhere":

1. **Does it need to be global at all?** Fold "manager" behavior into the thing
   it manages.
2. **Pass it in** — dependency injection. Dependencies stay visible and
   testable.
3. **Inherit it** — get it from a base class (Subclass Sandbox).
4. **Piggyback** on one existing root object (`Game` / `World`).
5. **Service Locator** — when access really is ubiquitous and you want it
   swappable. Use a null service for safety.
6. **Singleton** — last resort, and rarely the right one.

---

## Composition over inheritance: GameObject → Component → ECS → DOD

The dominant lineage in modern engine design:

1. **Monolithic GameObject** — one class with physics + render + input + AI.
   Tangles domains; rots as the game grows.
2. **Component** (OOP composition) — an entity is a bag of components, each
   owning one domain. Decouples domains; components are objects with data _and_
   behavior, scattered across the heap.
3. **ECS (Entity-Component-System)** — separates the three concerns:
   - **Entity** = a bare ID / handle (no data, no logic).
   - **Component** = pure data, no behavior.
   - **System** = behavior that runs over all entities with a given component
     set.
4. **Data-Oriented Design (DOD)** — store components in tightly-packed
   homogeneous arrays so systems iterate contiguous memory.

### AoS vs SoA

A cache line (~64 B) is fetched as a unit; the goal is to use every byte you
pull in.

- **AoS (array of structs)** interleaves all fields of one object — wasteful
  when a loop touches only one field (unused fields ride along and evict useful
  data).
- **SoA (struct of arrays)** stores each field in its own contiguous array, so a
  system streaming one attribute (e.g. positions) gets pure, prefetch-friendly
  data.

### When to climb the ladder

- Decoupling pain → **Component** (almost always a safe, cheap win).
- Many entities + cache-bound hot loops (confirmed by a profiler) → **ECS / DOD**.
- ECS/DOD buys throughput and easy parallelism at the cost of indirection,
  harder debugging, and a steeper mental model. It is an **optimization** —
  don't adopt it by default. Heed Knuth: premature optimization is the root of
  much evil.

Production ECS frameworks for reference: Unity DOTS/Entities, Bevy (Rust), EnTT
(C++), Flecs.

---

## Engine-aware note

If the game runs on an engine, the engine already implements many of these:

- **Unity** — MonoBehaviour `Update()` (Game Loop + Update Method),
  GameObject/Component composition, ScriptableObjects (Type Object), DOTS for
  ECS/DOD.
- **Unreal** — the tick loop, Actor/Component model, DataAssets/DataTables (Type
  Object), Blueprints (Bytecode/visual scripting).
- **Godot** — the main loop + `_process`/`_physics_process`, Node composition,
  Resources (Type Object).

Don't reimplement what the engine gives you. Apply these patterns _inside_ your
own gameplay code, where the engine leaves the structure to you.

---

## When a pattern hurts

Skip or remove a pattern when:

- It doesn't relieve real, current pain (you're building for imagined change).
- It adds a layer of indirection that makes the common case harder to read.
- The engine already solves the problem.
- It's an optimization pattern and no profiler justifies it.
- A simpler construct (a function, a closure, a plain array, an `enum`) does the
  job.
