# Pitfalls — the 13 classic traversal failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when players climb out of the map or the climb state flickers on seams.

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
- **Prevention** — all verb requests through the buffered intent system
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
- **Prevention** — volumes publish intents; **each verb declares its
  wind response** (glide full, climb zero-or-grip-event, ground
  partial); inner/outer boundary hysteresis; ease lift near the volume
  top.

## 9. Mount desyncs

- **Symptom** — the mount clips through doorways the rider can't pass;
  dismount drops the player inside a wall; the summoned mount can't
  path to the player.
- **Root cause** — divergent collision profiles; unvalidated dismount
  positions; summons assuming navmesh coverage.
- **Prevention** — validated dismount queries (capsule overlap at
  candidates, fallback ring, dismount-in-place last resort);
  auto-dismount volumes for rider-only spaces; summon = navmesh query +
  teleport-to-valid-when-unobserved fallback; disable the rider's
  controller/collision wholesale (half-disabled states are the desync
  source).

## 10. Grapple exploits

- **Symptom** — grapple attaches through walls; pendulums swing the
  player through geometry; anchors reachable from unintended angles
  skip puzzles.
- **Root cause** — distance-only anchor validation; untested swing
  paths; no reachability review.
- **Prevention** — LoS raycast in anchor validation; swing movement
  through the **same collide-and-slide solver** (the rope constrains
  intent, the solver constrains position); per-anchor approach cones
  when needed; a design-time reachability audit tool.

## 11. Traversal trivializing content

- **Symptom** — endgame players glide over every encounter; climbing
  skips dungeon interiors; designed routes become decoration.
- **Root cause** — traversal power grows while level design assumptions
  stay fixed (the documented BotW→TotK flight tension).
- **Prevention** — design valves from day one: interior no-climb/
  no-glide as standard authoring; **diegetic counters** (rain, gloom —
  fiction reads as design, silent disabling reads as a bug, and
  verb-disabled zones must be telegraphed visually); stamina as the
  tunable governor; the regional verb refresh strategy.

## 12. Streaming integration

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

## 13. Save/load mid-traversal

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

## Debugging order

When traversal misbehaves: (1) turn on the climbability visualization
and walk the area (#1), (2) climb across every kit seam in slow motion
(#2), (3) circle a building corner both ways (#3), (4) chain
jump→glide→dive while mashing (#4), (5) drain stamina on an overhang
(#5), (6) climb the moving platform (#7), (7) grapple at every anchor
from wrong angles (#10).

## Ship checklist

```
- [ ] Climbability debug view audited on every region (no out-of-bounds
      routes, no unmarked blockers)
- [ ] Kit-seam wall climbed at every angle: zero state flicker
- [ ] 90-degree corners (inside + outside) navigable without snapping
- [ ] jump->glide->dive chains buffer cleanly at any timing
- [ ] Stamina-zero on an overhang: the terminal policy fires, fair
- [ ] Moving-platform climb: attached, no drift, clean mantle
- [ ] Mount: doorway restrictions, validated dismounts, summon fallbacks
- [ ] Grapple: no through-wall attaches, swing collides properly
- [ ] Endgame valve test: interiors deny verbs diegetically, telegraphed
- [ ] Glide at max speed toward an unloaded cell: verb denied/held
- [ ] Save/reload during every verb: sane restore, no mid-air spawns
- [ ] Assist settings: full-assist and expert both playable end-to-end
```
