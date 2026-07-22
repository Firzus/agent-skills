# Pitfalls — the 14 classic traversal failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when players climb out of the map or the climb state flickers on seams.
Deep dives: [world-data.md](./world-data.md), [verbs.md](./verbs.md),
[implementation.md](./implementation.md),
[vehicles.md](./vehicles.md), [economy.md](./economy.md).

## 1. Climbing forbidden geometry

- **Symptom** — players climb kill volumes, out-of-bounds hills,
  quest-skip walls.
- **Root cause** — systemic climbing defaults everything climbable;
  no-climb markup is opt-out and nobody audits the opt-outs.
- **Prevention** — no-climb as a first-class authored channel with a
  **debug visualization mode**; a validation pass flagging climbable
  surfaces leading out-of-bounds; discipline: every blocker wall gets
  its markup when placed, not in beta.

## 2. Probe failures on modular/seamed geometry

- **Symptom** — climb state flickers crossing kit-piece seams; the
  character falls through a "crack" between flush meshes; normals flip.
- **Root cause** — thin rays falling in collider gaps; per-mesh normals
  disagreeing at seams; per-collider surface data differing across them.
- **Prevention** — shape sweeps wider than the capsule, never single
  rays; aggregate hits and reject outlier normals; **hysteresis to exit
  climb** (N consecutive failed probes); blanket-volume markup over
  kit-built climb walls.

## 3. Corner/edge navigation breaking

- **Symptom** — stuck at a 90° outside corner; inside corners trap or
  jitter; overhang transitions snap orientation 180°.
- **Root cause** — tangent-plane projection assumes continuous surface;
  corners are discontinuities needing explicit handling.
- **Prevention** — outside: wrap-probe past the edge, rotate the climb
  frame over ticks (slerp, never snap); inside: clamp lateral input when
  both walls hit; overhangs: cap normal pitch unless designed; shrink
  the climbing capsule.

## 4. Verb transition dead zones

- **Symptom** — jump→glide input eaten at apex; climb→jump→re-grab the
  same wall forever; dive→surface→climb fails at the waterline.
- **Root cause** — transitions legal only in narrow windows with no
  buffering; re-entry conditions identical to exit conditions.
- **Prevention** — all verb requests through the typed `Traversal Request` pipeline
  (timestamped, revalidated); re-entry refractory after climb→jump
  (~200–300 ms or wall distance); the waterline as an explicit boundary
  state, not an emergent collision of conditions.

## 5. Stamina edge cases

- **Symptom** — stamina hits zero mid-overhang = long unavoidable fall;
  the UI ring shows stamina left but grip already released.
- **Root cause** — hard zero-cutoff with no terminal policy; UI reading
  a smoothed value while logic reads raw.
- **Prevention** — a designed terminal policy (grace window ~0.5–1 s /
  auto-ledge-grab in reach / slide-not-fall on non-overhangs); UI bound
  to the authoritative value, smoothing presentation-only.

## 6. IK stretching/popping

- **Symptom** — hands rubber-band across gaps; feet float over hollows;
  limbs pop during climb-jumps.
- **Root cause** — IK targets from raw probe hits with no reach clamp;
  IK solving against the surface while root motion displaces the root.
- **Prevention** — clamp effectors to limb extension (weight to 0 beyond
  reach, never stretch); per-limb raycasts from animated limb positions;
  ramp IK weights down during bursts, back in on re-contact; reject
  targets whose normal disagrees with the climb frame.

## 7. Climbing moving surfaces

- **Symptom** — climbing an elevator/ship hull: the character slides off
  or warps when the platform turns.
- **Root cause** — climb frame stored in world space while the surface's
  reference frame moves (the basing problem from `character-controller`).
- **Prevention** — store the attachment **in the surface's local space**
  (collider-relative position + normal), recompose each tick;
  mantle/vault onto movers via followed-component warp targets, never
  captured world locations.

## 8. Wind volumes fighting verbs

- **Symptom** — glide in an updraft oscillates; wind shoves a climber
  off a wall unexpectedly.
- **Root cause** — volumes writing forces directly into velocity,
  bypassing the state machine; lift flipping at the volume boundary.
- **Prevention** — volumes publish versioned facts; **each verb resolves its
  wind response** (glide full, climb zero-or-grip-event, ground partial) into
  immutable request/replay data; inner/outer boundary hysteresis; ease lift near
  the volume top.

## 9. Grapple exploits

- **Symptom** — grapple attaches through walls; pendulums swing the
  player through geometry; anchors reachable from unintended angles
  skip puzzles.
- **Root cause** — distance-only anchor validation; untested swing
  paths; no reachability review.
- **Prevention** — LoS raycast in anchor validation; swing movement
  through the **same Mover-owned collision path** (the rope constrains
  intent, the solver constrains position); per-anchor approach cones
  when needed; a design-time reachability audit tool.

## 10. Traversal trivializing content

- **Symptom** — endgame players glide over every encounter; climbing
  skips dungeon interiors; designed routes become decoration.
- **Root cause** — traversal power grows while level design assumptions
  stay fixed (the documented BotW→TotK flight tension).
- **Prevention** — design valves from day one: interior no-climb/
  no-glide as standard authoring; **diegetic counters** (rain, gloom —
  fiction reads as design, silent disabling reads as a bug, and
  verb-disabled zones must be telegraphed visually); stamina as the
  tunable governor; the regional verb refresh strategy.

## 11. Streaming integration

- **Symptom** — climbing into an unloaded cell = falling through the
  world; glide outpaces streaming; an anchor exists but its collision
  doesn't.
- **Root cause** — traversal verbs raise reachable-space velocity past
  streaming assumptions; verbs depend on world data with no residency
  check.
- **Prevention** — never simulate over missing collision (deny the verb
  or hold the character — `open-world-streaming`); traversal-aware
  streaming budgets (glide speed defines the required radius); anchors/
  volumes registered through the streaming lifecycle so validity
  queries inherently know residency.

## 12. Save/load mid-traversal

- **Symptom** — reloading while climbing spawns the character mid-air;
  a glide save restores into a fall.
- **Root cause** — saves capture position but not verb state, or
  restore verb state the world can't support yet.
- **Prevention** — a per-verb policy: serialize verb state + attachment
  frame and **revalidate on load** (probe must reconfirm; fail →
  fallback), or demote to the last safe grounded position (the
  breadcrumb from `character-controller`); block saves during
  non-resumable verbs (mid-zipline) or snap to the nearest resumable
  point (`save-persistence` CanSave).

## 13. Automation overriding player intent (parkour)

- **Symptom** — in a contextual/automated traversal system, "one
  movement is expected, but another comes out, throwing off the planned
  route"; the character gets "sucked into" unwanted ledges; the player
  feels the game is playing itself.
- **Root cause** — a single "hold one button, climb anything" input with
  automated move-selection that magnetically latches onto geometry,
  removing the player's ability to *express* route choice (the
  documented Assassin's Creed backlash).
- **Prevention** — give the player directional intent over the
  automation (AC Unity's parkour-up / parkour-down split: hold up → the
  higher route, down → the lower); keep some inputs the player *can* get
  wrong (Mirror's Edge's losable manual moves); telegraph affordances
  consistently so the authored route doesn't fight the player's read. See
  [verbs.md](./verbs.md) and [world-data.md](./world-data.md).

## 14. Readability lies / momentum-vs-stamina mismatch

- **Symptom** — with assist/highlight off, "some surfaces look climbable
  but aren't, others are but don't look it"; or a momentum-based parkour
  game bolts on a stamina drain (or a stamina-climbing game expects
  momentum chaining) and the feel fights itself.
- **Root cause** — a curated highlighted path (Runner Vision) hiding
  inconsistent affordances; or mixing the two opposite economies
  (momentum = accumulate/protect vs stamina = spend/deplete) without
  deciding which behavior the game rewards.
- **Prevention** — make affordances **consistent** even under the
  highlight (don't let the cue lie); pick the economy school deliberately
  ([economy.md](./economy.md)): stamina-as-wall (read the cliff, manage
  the pool) OR momentum-as-fuel (never stop, loss felt as slowdown), and
  tune every number to that choice. If blending (Dying Light), accept and
  budget the level-design cost of climb-anything.

## Debugging order

When traversal misbehaves: (1) turn on the climbability visualization
and walk the area (#1), (2) climb across every kit seam in slow motion
(#2), (3) circle a building corner both ways (#3), (4) chain
jump→glide→dive while mashing (#4), (5) drain stamina on an overhang
(#5), (6) climb the moving platform (#7), (7) grapple at every anchor
from wrong angles (#9).

## Ship checklist

```
- [ ] Climbability debug view audited on every region (no out-of-bounds
      routes, no unmarked blockers)
- [ ] Kit-seam wall climbed at every angle: zero state flicker
- [ ] 90-degree corners (inside + outside) navigable without snapping
- [ ] jump->glide->dive chains buffer cleanly at any timing
- [ ] Stamina-zero on an overhang: the terminal policy fires, fair
- [ ] Moving-platform climb: attached, no drift, clean mantle
- [ ] Grapple: no through-wall attaches, swing collides properly
- [ ] Endgame valve test: interiors deny verbs diegetically, telegraphed
- [ ] Glide at max speed toward an unloaded cell: verb denied/held
- [ ] Save/reload during every verb: sane restore, no mid-air spawns
- [ ] Assist settings: full-assist and expert both playable end-to-end
- [ ] Automation gives directional intent; no "sucked-into-ledge" overrides
- [ ] Affordances consistent under highlight-off; one economy school chosen
```
