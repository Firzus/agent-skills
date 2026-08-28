# Techniques — architectures, navigation, steering, ML, scale

The technical foundations for working programmers. Shipped-practice vs research
flagged. Uncertainty `[?]`.

## Decision-making architectures

- **FSM → HFSM**: states + transitions; cheapest, most intuitive. Weakness:
  transition explosion (every state knows transitions to every other → ~O(n²) edges,
  "spaghetti"). HFSM nests states to tame the count. The practical hybrid: **FSM for
  top-level modes, BT inside each mode**.
- **Behavior Trees**: **Composite** (Sequence = AND-until-fail; Selector/Fallback =
  OR-until-success; Parallel), **Decorator** (inverter, cooldown, loop, conditional/
  observer-abort), **Leaf** (Action/Condition). A **Blackboard** decouples nodes. The
  tree re-evaluates from the root each tick; nodes return Success/Failure/Running.
  Statelessness = modularity (subtrees added without touching siblings). The shipped
  norm is **event-driven** (observer aborts + an execution stack, not naive polling —
  UE's BT does this).
- **GOAP** (F.E.A.R.): world-state as a symbol set; actions carry preconditions +
  effects; the planner runs **A\* over action space** (backward from goal). Strength:
  emergent, designer drops/adds actions without rewiring. Cost: the whole search to
  know the first step; pricey per replan.
- **HTN**: methods (compound tasks → decompositions) + primitives. Forward
  decomposition; the hierarchy **culls large sections** of the search → faster than
  GOAP (shipped: Killzone 2, Transformers). Tradeoff: more authored structure.
- **Utility / IAUS** (Dave Mark): each Behavior scored by N **Considerations**, each
  mapping a raw input → [0,1] via a **response curve** (linear, logistic, Gaussian for
  a "sweet spot"); scores multiplied → pick argmax. Scales O(actions × considerations);
  personality = change the curve, not the structure. Weakness: opaque scores to debug.
  Often layered: **utility selects intent → BT executes**.

| Technique | Best for | Designer control | Debuggability | Cost |
| --- | --- | --- | --- | --- |
| FSM/HFSM | high-level modes | high | high | lowest |
| Behavior Tree | tactical, engine-native | high | high | low |
| GOAP | emergent multi-step | med (via costs) | low–med | high (planning) |
| HTN | authored multi-step, AAA speed | high | med | med |
| Utility/IAUS | soft priorities, personality, sims | med | low–med | med |

## Navigation

- **Navmesh generation — Recast** (powers Unity/Unreal/Godot): a **voxelization
  pipeline** — rasterize triangles into a heightfield → filter non-walkable + erode by
  agent radius → distance field → partition into regions → trace contours →
  re-triangulate to convex polys. Tiled navmesh enables re-baking/streaming.
- **Pathfinding — Detour**: A\* over navmesh polys → a polygon **corridor**.
  **String-pulling**: the **Simple Stupid Funnel Algorithm** refines the corridor's
  portals into straight segments (don't trace polygon-edge midpoints — the wrong
  reference). **HPA\*** clusters the map into regions for coarse→fine planning.
- **Local avoidance vs steering** (distinct layers): steering = where I want to go;
  avoidance = adjust velocity so agents don't collide. **RVO** (reciprocal velocity
  obstacles) can oscillate; **ORCA** (each agent takes *half* the responsibility via a
  half-plane of permitted velocities, solved by 2D linear programming) is smooth,
  oscillation-free, thousands of agents in ms (the RVO2 library). **Detour Crowd** is
  the engine-side glue (path-following + RVO-style avoidance).
- The universal layering: **global path (navmesh A\* + funnel) → local steering/
  avoidance (Crowd/ORCA) → locomotion** (Reynolds' goal/steering/locomotion split).

## Steering & context steering

- **Boids** (Reynolds): Separation + Alignment + Cohesion. Primitives: Seek, Flee,
  Arrive, Pursue, Evade, Wander, Obstacle Avoidance, Path Following.
- The **combination problem**: naive weighted vector-sum of forces is fragile
  (behaviors fight, agents drive into walls).
- **Context steering** (Game AI Pro 2): replace force-summing with two **context
  maps** — 1D arrays over discretized headings: an **interest map** (where to go) and a
  **danger map** (what to avoid). Behaviors *write* into maps (stateless, decoupled);
  the system **masks danger then picks the best remaining interest slot**. Shipped on
  F1 2011 (cut 4000 lines, avoided collisions better). Strong for racing, swarms.

## Spatial reasoning

- **Influence maps** (Game AI Pro 2): a grid where each agent **propagates** influence
  via distance → a response curve, with **decay over time** + blur. Optimization:
  precomputed **stamps** added/subtracted at agent positions. Combine maps (add/
  multiply) for compound queries; the peak cell = center-of-influence. Tactical
  (immediate cover/threat) vs strategic (territory) layers.
- **EQS — Environment Query System (Unreal)**: **Generators** (candidate points/actors)
  → **Tests** (distance, dot/angle, LoS trace, pathfinding cost) → weighted scoring →
  best item. The shipped UE way to "find the best cover/flank/shooting position".
- **EQS vs influence maps**: EQS = on-demand around a point; influence maps = cached,
  environment-wide, persist over time (cheaper for repeated/global questions).

## ML for game AI — reality vs hype (2024–2026)

- **Shipped ML (rare, narrow)**: Forza **Drivatar** (player-style imitation), Unity
  **ML-Agents** (PPO/SAC/BC/GAIL — used mostly for **playtesting/QA bots and
  balancing**, not player-facing NPCs).
- **Research, NOT shipped**: AlphaStar (StarCraft II Grandmaster, multi-agent league),
  OpenAI Five (Dota 2, PPO self-play), BeTAIL (Gran Turismo imitation).
- **Why shipped AI is still hand-authored**: opacity/debuggability (a trained net has
  no tree to read; QA can't characterize it), designer control ("more aggressive in
  level 2" = a 2-line BT edit vs a retraining run), determinism, fragility to patches,
  sample inefficiency. Game AI is **constrained theatrical design** (expressive,
  legible, controllable, performant), not a supervised/RL objective. The constraint is
  **authorability, not engine capability**.
- **LLM-NPC frontier**: LLMs for dialogue/barks/persona, not movement/tactics —
  latency, cost, hallucination, and non-determinism keep them out of core combat loops
  (see `dialogue-system`).

## Performance & scale

- **LOD-for-AI**: near = full brain + skeletal anim; far = positional-only. UE City
  Sample: near = full rig, mid = Vertex Animation Textures, far = pure Mass entities.
  Skeletal LOD0 ≈ 50× the cost of instanced static-mesh LOD — **near-LOD skeletal
  count matters more than total agent count**.
- **Time-slicing / budgeted ticking**: spread expensive work across frames (UE
  `AISense_Sight` exposes `MaxTimeSlicePerTick`; EQS time-slices). Run perception,
  pathfinding, and avoidance on **worker threads**.
- **Crowds at scale**: **Unity DOTS** (ECS + Job System + Burst; flow fields on GPU
  compute) and **UE Mass** (MassEntity ECS + ZoneGraph nav + StateTree logic + LOD
  tiers; ~10k agents @ ~4.6 ms on an RTX 4080 `[vendor-reported]`).
- **Flow fields** (Supreme Commander): a vector field over a grid → many agents share
  **one** field, so **cost doesn't scale with agent count**. Tile + hierarchical: build
  fields only along a coarse path; GPU compute baking for dynamic targets. Plus
  **formations** (leader paths once, followers offset) and **StateTree over Tick**.

## Unity ↔ UE5 mapping

| Capability | Unity | UE5 |
| --- | --- | --- |
| Decision logic | Behavior pkg / Behavior Designer; DOTS custom | **BT + Blackboard** (event-driven); **StateTree** |
| Utility AI | DIY / assets | DIY / plugins |
| Navmesh + path | NavMesh (Recast) + A* Pathfinding Project | Detour A\* + funnel |
| Local avoidance | NavMesh avoidance / RVO assets | **Detour Crowd** / Mass avoidance |
| Spatial queries | DIY / assets | **EQS** (native) |
| Crowds | **DOTS/ECS + Burst** + flow fields | **Mass** (MassEntity + ZoneGraph) |
| Perception | DIY / sensors | **AIPerception** (time-sliced) |
| ML | **ML-Agents** | Learning Agents (experimental) |

## Flagged gaps — do NOT invent

Modern Drivatar internals are not public · "EDBT" terminology is non-standard · IAUS
"marginal/dual utility" is Mark's proprietary framing · Mass/DOTS benchmark numbers
are vendor-reported · AlphaStar/OpenAI Five/BeTAIL are research, not shipped.

## Sources

Game AI Pro (HTN Ch.12, Context Steering Ch.18, Influence Maps Ch.30, Flow Fields) ·
Reynolds *Steering Behaviors* (GDC 1999) · Orkin GOAP (GDC 2006) · Dave Mark IAUS /
*Behavioral Mathematics* · Recast/Detour (Mononen) · RVO/ORCA (gamma.cs.unc.edu) ·
AlphaStar (Nature 2019) · OpenAI Five · Unity ML-Agents · Epic *Designing Scalable
Crowds with Mass AI* · redblobgames (flow fields).
