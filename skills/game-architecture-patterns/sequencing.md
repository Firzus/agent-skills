# Sequencing Patterns

Patterns about time and frames: the heartbeat of the game, per-entity advance,
and guarding state that's read while it's written.

Source: Robert Nystrom, _Game Programming Patterns_ — "Sequencing Patterns".

These three (Game Loop, Update Method, Component) form the nucleus of most game
engines.

---

## Game Loop

- **Intent** — Decouple the progression of game time from user input and
  processor speed.
- **Problem solved** — Games must keep advancing (animation, physics, AI)
  without blocking on input, and run at a consistent speed across wildly
  different hardware.
- **Solution shape**

```cpp
while (running) {
  double start = now();
  processInput();                 // non-blocking
  lag += elapsedSince(previous);
  while (lag >= MS_PER_UPDATE) { update(); lag -= MS_PER_UPDATE; } // fixed-step sim
  render(lag / MS_PER_UPDATE);    // pass interpolation factor 0..1
}
```

- **Pitfalls / costs** — This is the hottest code in the game — efficiency-
  critical. Naive "run as fast as possible" is hardware-dependent. Pure
  **variable time step** adapts to machine speed but makes physics/networking
  **non-deterministic and unstable** (float divergence, physics blow-up). The
  catch-up loop can spiral if one `update()` is slower than the step — cap the
  iterations.
- **When to avoid / modern alternative** — You don't write it when the platform
  owns the loop: browsers (`requestAnimationFrame`), Unity, Unreal, Godot drive
  it for you. Best general design: **fixed update step + variable/decoupled
  rendering with interpolation** (cf. Glenn Fiedler, "Fix Your Timestep"). Clamp
  frame rate on mobile for battery; run uncapped on PC.
- **Related** — Update Method (what `update()` runs each tick), Double Buffer
  (swap synced to refresh).

---

## Update Method

- **Intent** — Simulate many independent objects by telling each to advance one
  frame of behavior at a time.
- **Problem solved** — Per-entity behavior mushed into the game loop; instead,
  each entity encapsulates its own per-frame logic behind `update()`.
- **Solution shape**

```cpp
struct Entity { virtual void update(double dt) = 0; };
class Skeleton : public Entity { bool patrollingLeft_;
  void update(double dt) override { /* one frame of patrol */ } };
// World: for (Entity* e : entities_) e->update(dt);  // once per frame, from Game Loop
```

- **Pitfalls / costs** — You must store resume state explicitly (e.g.
  `patrollingLeft_`); objects are **not truly concurrent** — update _order_
  matters (B sees A's new state the same frame); mutating the entity list
  mid-iteration causes skipped/double updates (iterate backwards, cache the
  count, or defer add/remove); iterating dormant objects wastes cycles and
  thrashes cache.
- **When to avoid / modern alternative** — Poor fit for turn-based/abstract
  pieces (a chess pawn doesn't need a per-frame update). The industry moved
  `update()` off a subclassed `Entity` onto **components (Component / ECS)** to
  avoid brittle hierarchies. For hot loops, **Data Locality** (SoA) improves
  cache behavior. Coroutines/fibers or **Bytecode** let you keep straight-line
  behavior code instead of manual frame-state. Use **Double Buffer** if you need
  order-independence.
- **Related** — Game Loop & Component (the engine "trinity"), State / Type Object
  (homes for a delegated `update()`), Data Locality.

---

## Double Buffer

- **Intent** — Make a series of sequential operations appear instantaneous /
  simultaneous to outside observers.
- **Problem solved** — State read while it's being written: graphics **tearing**
  (the driver reads the framebuffer mid-draw); also order-dependent simulation
  where actors read each other's state mid-update.
- **Solution shape**

```cpp
class Scene { Buffer buffers_[2]; Buffer* current_; Buffer* next_;
  void draw() { /* write to next_ */ }
  void swap() { std::swap(current_, next_); } };  // reads hit current_, writes hit next_
```

- **Pitfalls / costs** — Requires **two copies** of state (memory cost, bad on
  constrained devices); the **swap must be atomic** and cheaper than the
  modification, or you've gained nothing; a pointer-swap leaves buffer data two
  frames old, while a copy-swap keeps it one frame old but costs a full copy.
- **When to avoid / modern alternative** — Skip if state isn't accessed
  mid-modification, or if you can't afford two buffers. For graphics it's
  effectively mandatory and already provided by the platform (`SwapBuffers`, D3D
  swap chains). For distributed per-object state, a current/next index/offset
  trick gives monolithic-swap speed.
- **Related** — Update Method (use Double Buffer when update order must not
  matter), Game Loop (buffer swap synced to refresh).
