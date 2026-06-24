# Optimization Patterns

Patterns that trade simplicity for speed or memory.

> **Measure first.** Every pattern here adds complexity. Apply it only when a
> profiler shows the bottleneck it targets. Premature optimization is complexity
> you pay for in every future change.

Source: Robert Nystrom, _Game Programming Patterns_ — "Optimization Patterns".

---

## Data Locality

- **Intent** — Accelerate memory access by arranging data to exploit CPU
  caching.
- **Problem solved** — A cache miss stalls the CPU for hundreds of cycles;
  pointer-chasing object graphs (entity → component → data) thrash the cache and
  can run an order of magnitude slower than contiguous access.
- **Solution shape**

```cpp
// Instead of entities[i]->physics()->update()
PhysicsComponent physics[MAX];                 // one packed array per domain
for (int i = 0; i < n; i++) physics[i].update();  // straight, prefetch-friendly crawl
```

Techniques: contiguous component arrays; **packed data** (sort active items to
the front, skip inactive); **hot/cold splitting** (keep per-frame "hot" fields
inline, push rarely-used "cold" fields behind a pointer).

- **Pitfalls / costs** — Fights abstraction: you sacrifice interfaces,
  inheritance, and virtual dispatch (the indirection causes the misses you're
  avoiding); hot/cold boundaries are rarely clear-cut; relocating data to keep
  it packed adds bookkeeping (and can break pointers).
- **When to avoid / measure first** — Only when a cache-aware profiler confirms
  cache misses are the cost. Don't apply to cold paths. Still, design data
  layout with cache-friendliness in mind throughout.
- **Related** — Component, Object Pool (the contiguous array you iterate), ECS /
  data-oriented design.

---

## Dirty Flag

- **Intent** — Avoid unnecessary work by deferring it until the result is
  actually needed.
- **Problem solved** — Derived data (e.g. world transforms in a scene graph) is
  expensive and depends on frequently-changing primary data; recomputing eagerly
  on every change recalculates the same result many times per frame.
- **Solution shape**

```cpp
void setLocal(const Transform& t) { local_ = t; dirty_ = true; }
void render(const Transform& parentWorld, bool parentDirty) {
  bool dirty = parentDirty || dirty_;
  if (dirty) { world_ = local_.combine(parentWorld); dirty_ = false; }
  // pass `dirty` down so a parent's change propagates to children
}
```

- **Pitfalls / costs** — **Cache invalidation is the hard part**: miss one
  mutation path and you serve stale data → nasty bugs; deferring too long can
  cause a visible pause when the big computation finally runs; if deferred work
  is for persistence and you crash, it may never happen; you keep the previous
  derived result in memory.
- **When to avoid / measure first** — Worthwhile only when primary data changes
  _more often_ than the derived data is used, and the work is hard to update
  incrementally. If you can cheaply "pay as you go" (keep a running total), do
  that instead.
- **Related** — A caching/memoization pattern; physics "sleeping body" flags;
  framework change-tracking.

---

## Object Pool

- **Intent** — Improve performance and memory use by reusing objects from a
  fixed pool instead of allocating/freeing individually.
- **Problem solved** — Frequent create/destroy of many similar objects
  (particles, sounds, projectiles) is slow and fragments the heap — deadly on
  consoles/mobile where the largest contiguous block shrinks until allocations
  fail.
- **Solution shape**

```cpp
// Pre-allocate a fixed contiguous array; track free slots with a free list
// threaded through the unused objects themselves (a union over dead-state memory).
Obj* create(/* args */) { Obj* p = firstAvailable_; firstAvailable_ = p->getNext(); p->init(/* args */); return p; }
void destroy(Obj* p)     { p->setNext(firstAvailable_); firstAvailable_ = p; }   // O(1)
```

- **Pitfalls / costs** — Fixed capacity: handle exhaustion deliberately (tune
  size / don't-create / kill quietest / grow); slots sized for the largest
  object waste memory when sizes vary; reused memory isn't auto-cleared — fully
  re-initialize on reuse; with a GC, pooled objects holding references keep
  others alive (clear references on release).
- **When to avoid / measure first** — Use only when you genuinely create/destroy
  often, objects are similar in size, and allocation cost or fragmentation is a
  measured problem (or each object wraps an expensive resource). You're
  overriding the allocator — lifetime management is now yours.
- **Related** — Data Locality (a pool is the packed array you iterate). Distinct
  from **Flyweight**: Flyweight shares one instance across owners
  _simultaneously_; a pool reuses an object _over time_ with one owner at a time.

---

## Spatial Partition

- **Intent** — Efficiently locate objects by storing them in a data structure
  organized by their positions.
- **Problem solved** — "What objects are near this location?" (combat targeting,
  collision, proximity audio) done naively is an O(n²) all-pairs scan that
  explodes as object count grows.
- **Solution shape**

```cpp
// Fixed grid of cells, each holding a list of units; compare only within a cell.
void add(Unit* u)  { int cx = u->x / CELL_SIZE, cy = u->y / CELL_SIZE; cells_[cx][cy].insert(u); }
void move(Unit* u) { /* if it crossed a cell boundary, unlink from old, add to new */ }
// For attack ranges spanning boundaries, also test HALF the neighbors to avoid double-counting.
```

- **Pitfalls / costs** — Moving objects must be re-inserted as positions change
  (added complexity and CPU); extra memory for bookkeeping; a fixed grid
  degrades back to O(n²) if objects clump into one cell; empty cells still cost
  memory/iteration.
- **When to avoid / measure first** — Only when n is large enough that location
  queries are a measured bottleneck. With small n the bookkeeping isn't worth
  it; if you're shorter on memory than CPU it can be a losing trade.

### Choosing a spatial structure

| Structure | Shape | Best for |
| --- | --- | --- |
| **Grid** | flat, object-independent, fixed cells | many _moving_, roughly uniform objects (RTS units, bullet-hell); constant memory, fast incremental move; weak with clustering |
| **Quadtree / Octree** | hierarchical, splits space, subdivides only where dense | _dynamic_ worlds with uneven density; adapts to clustering, fast incremental add/move — the all-round default |
| **BSP** | hierarchical, geometry-dependent split planes | _static_ level geometry: rendering order, visibility/PVS, indoor collision; expensive to build |
| **k-d tree** | hierarchical, axis-aligned balanced splits | _static_ point sets, nearest-neighbor / ray queries; rebalancing on movement is costly |
| **BVH** | hierarchical, groups objects by bounding volume | collision over many meshes and **ray tracing**; refits to follow geometry |

Rule of thumb: **object-dependent, balanced** structures (BSP, k-d, BVH) give
consistent query times and suit _static_ content built all at once;
**object-independent** structures (grid, quadtree/octree) suit _dynamic_ content
added and moved incrementally.

- **Related** — Often paired with a flat collection for fast "visit-all"
  traversal. Each structure is a higher-dimensional analog of a 1D one: grid =
  bucket sort; BSP/k-d/BVH = binary search trees; quadtree/octree = tries.
