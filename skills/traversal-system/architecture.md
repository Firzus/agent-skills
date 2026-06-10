# Architecture — world data, verbs, climbing, air, water, economy

The components of a production traversal system. All numbers are
**starting points — tune by playtest**; flagged gaps are listed at the
bottom. Primary sources: GDC 2017 *Breaking Conventions with BotW*,
CEDEC 2017 field level design, GDC 2024 *Tunes of the Kingdom*, Genshin
wikis/KQM, the Cantão BotW-climbing recreation.

## The world side

- **Climbable-by-default (the BotW inversion)**: every collision is
  climbable unless explicitly marked. The production cost moves: instead
  of tagging climbable surfaces, level design guarantees non-climbable
  surfaces *read visually* (smooth Sheikah stone). No-climb is a
  first-class authored channel with a debug visualization mode —
  auditable, reviewable.
- **Runtime detection, no handhold markup**: shape sweep (wider than the
  capsule) or multi-height ray fan → hit array → **refinement traces
  toward each hit** for clean position/normal (overlaps alone give false
  normals on overlapping geometry) → reorient on the normal, move
  tangent to the surface. Eye-height trace detects top-out (mantle).
- **Surface state as dynamic modifier**: wet/slippery is weather state
  applied to the material, not a second markup (BotW rain).
- **Volumes** declare: enabled verb, gravity override, drain policy.
  Water (+ min depth for dive), updrafts (placed AND emergent — BotW's
  grass fires feed the chemistry engine), currents, ladders (free
  climb).
- **Anchors** (grapple points, hookpoints): hand-placed data — the
  designer-controlled counterpoint to systemic surfaces. Definition
  (range class, swing type) in shared data; placement in scene markers;
  queried via a registry + angle/LoS filter.
- **Guidance without walls** (CEDEC): the triangle rule (climb-or-around
  choices, view occlusion), landmark gravity, bowl topography
  (descending is free, so important destinations sit low — "gravity to
  go forward").

## The verb side

Each verb is a self-contained module (the Capabilities pattern from
`character-controller`) registered with the traversal system. The
controller HSM provides *states*; this system provides the *catalog* and
the world↔verb binding.

**The declaration contract** (per verb): required world data · controller
services (gravity off, collision profile — TotK Ascend ignores target
ceiling collision —, normal reorientation, motion warping) · costs
(drain/s, per-action bursts, alternate pools) · animation set + IK
policy · **interrupt contract** (what cuts me, exit state, what buffers
through).

**Granting**: progression (paraglider, Ascend), equipment/gadget
(Sorush), region (Fontaine diving, Natlan Phlogiston — gating expressed
as a world-data requirement satisfiable only there), temporary blessing.
Case study: Genshin's regional verbs — Four-Leaf Sigils (placed grapple),
waverider (vehicle-verb with its own stamina), Saurian Indwelling
(possession mounts-as-verbs: digger, grapple-tongue, fast swimmer).

## Climbing deep dive

- **BotW**: any unmarked surface; speed/drain scale with slope angle
  (steepest drains fastest); climb-jump = distance burst for a big
  stamina cost; overhangs = release (normal past threshold). Rain adds a
  cyclic slip-back (~3–5 steps then slip) — **deliberately beatable** by
  timing jumps before the slip. Towers/shrines placed as climb-route
  attractors; a feel detail worth copying: a jump-height boost when
  stamina is nearly empty near a summit ("phew, made it").
- **Genshin**: slower, steadier drain, no rain slip (a deliberate
  trade: less friction, less weather×traversal interplay); the food
  economy (consumption reducers, mid-climb restore via paused inventory)
  replaces weather as the lever. Climb speed varies by character model
  class (measured).
- **TotK Ascend**: born as a debug command, promoted because "cheating
  can be fun" — the designed shortcut-solver that also fixes BotW's
  overhang wall (an overhang becomes a door). Real cost: validating
  every ceiling (max thickness, valid exit surface).
- **Corners**: outside 90° = wrap-probe past the edge, rotate the climb
  frame over several ticks (slerp, never snap); inside = blend/pick
  dominant normal, clamp lateral input; shrink the climbing capsule.
- **IK is purely visual**: ~8 directional cycles + hand/foot IK onto
  irregular surfaces. Production corollary: BotW's world is sculpted in
  broad smooth surfaces *because* the anim system is simple — level art
  and climbing system co-determine each other.

## Air traversal

- **Glide = energy conversion**: altitude (spent stamina) → horizontal
  distance. Updrafts reset the loop; in-updraft glide refills/pauses
  drain (BotW) or costs nothing (Genshin wind currents) — infinite
  loiter by design.
- **The paraglider moment**: the Great Plateau is a tutorial walled by
  the void; the glider is the game's only single-solution item gate, and
  it answers "you climbed up — how do you get down". Grant the
  descending verb after the cost of ascent is felt.
- **Vertical bursts** (Revali's Gale, rockets): updraft-on-demand on a
  cooldown — extends the jump button (hold = burst; one button = one
  action family), bypasses rain, resource-limited so climbing stays
  relevant.
- **Chains**: jump→glide→dive (TotK: dive = speed, glide = control, free
  transitions both ways; Genshin: plunge as the offensive glide exit) —
  demands clean interrupt contracts and buffered inputs across aerial
  verbs.

## Water traversal

- **Two models**: the classic surface swim (stamina wall — depletion =
  drowning) vs **Fontaine free-3D underwater** (separate non-upgradable
  Aquatic Stamina draining only on sprint, **no drowning** — water
  becomes a space, not a barrier; measured: tap-swim ~9% faster than
  hold).
- The same water serves as wall (deep ocean elsewhere), highway
  (currents, liquid Spiritways), and climbable vertical wall via verbs
  (waterfall ascent). Architecture: water = volume + current splines;
  verbs declare which currents they consume.
- **Combat verbs reused as traversal** (Cryo freezing a crossing) — the
  canonical multiplicative-design example.
- Vehicle-verbs: waverider (permitted zones, own stamina, no drowning);
  TotK player-built boats (possible because *everything* is rigid body +
  constraints + motors — GDC 2024).

## Mounts (light)

- **BotW horses**: soothe taming (costs Link's stamina), 0–100 bond,
  gallop 14.4–18.6 m/s by stars (~3–4× sprint), spurs 2–5 as burst
  economy, **road auto-follow** (frees attention — looking at the
  scenery is the point), whistle at earshot only, stables as the
  persistent network. Deliberately orthogonal to climbing: roads vs
  cliffs.
- **The teleport-vs-ride tension**: free fast travel cannibalizes
  mounts. Responses: earned-only fast travel (discover on foot first —
  both reference games), making the journey itself generative (systemic
  traversal IS BotW's answer), persistent shortcuts over teleports.
- Implementation: controller-swap (see SKILL.md engine table) with
  validated dismount queries and auto-dismount volumes.

## Assists & feel

- **Magnetism that doesn't feel sticky**: accelerate the climber
  *toward* the surface (grip force replacing gravity) rather than
  position-snapping; UC4's analog reach rings show agency beats
  auto-snap.
- **The GDC detection windows** (Splash Damage, GDC 2012): vault
  0.4–0.8× character height, mantle 0.8–1.4×, wall-hop = mantle + jump
  height; detect within 2.5× bbox width facing the ledge; prefer mantle
  if within 1.5× bbox width. For a 1.8 m character: vault ≈0.7–1.4 m,
  mantle ≈1.4–2.5 m (derived).
- **Auto-vault philosophy**: BotW/Genshin auto-clamber on contact (zero
  input, minimal friction — at the cost of unwanted grabs, a known
  inherited flaw). Expose the assist ladder in settings: full-assist
  (auto-vault, generous snap) → expert (manual, tight windows).
- **Buffering across verbs**: ~100–120 ms buffer traversing transitions,
  clear-on-consume, explicit priority between candidate verbs; ~100 ms
  coyote on surface exits; re-entry refractory (~200–300 ms or
  distance-from-wall) after climb→jump to kill re-grab loops.
- **Terminal stamina policy** (design, not accident): a grace window
  (~0.5–1 s burning red), auto-ledge-grab if in reach, or
  slide-down-instead-of-fall on non-overhangs. UI binds to the
  authoritative value (presentation-only smoothing).
- Per-verb camera presets (climb pulls up/back, glide widens FOV, dive
  tightens) — reference `camera-system`.

## The economy as governor

- Stamina upgrades are the real traversal progression: BotW 4 orbs =
  1 vessel (+1/5 wheel), 10 vessels max, forced hearts-vs-stamina
  trade-off (120 shrines can't max both); TotK identical economy
  (152 shrines); Genshin +7/+7/+8×7 per statue (cap 100→240), oculi
  curves 65 (Mondstadt) → 130 → 180 per region.
- **Regional pools** decouple regional traversal from global progression
  (Aquatic Stamina is deliberately flat; Phlogiston/Nightsoul recharge
  from placed world content — making recharge itself an exploration
  loop). The generalizable pattern: "charged traversal currency".
- **Keeping endgame interesting**: diegetic re-constraints (gloom, rain
  — never silent disabling: it reads as a bug; fiction reads as design),
  the regional verb refresh (rotate the catalog), composition spaces
  (Ultrahand). The TotK lesson: flight devalued grounded traversal —
  plan the valve before shipping the verb.

## Flagged gaps — do NOT invent

BotW climb speed in m/s, vertical meters per wheel, climb-jumps per
wheel (only ~20–25 s/wheel and relative modifiers exist) · glide ratios
and updraft lift speeds (the ~3:1 figure is inference) · absolute
snap-to-grab distances (only the GDC relative windows are citable) ·
Genshin current/waverider speeds and glide sink rate (unverified) ·
TotK tower launch heights (conflicting sources) · BotW slip-back
distances (only the step pattern is citable).

## Sources

GDC 2017 *Breaking Conventions with BotW* · CEDEC 2017 field level
design (Walker translation) · GDC 2024 *Tunes of the Kingdom* (the
physics-driven world) · GDC 2012 *Vault, Slide, Mantle* (Splash Damage)
· GDC *Obstacle Traversal in the Organic World of Pandora* · Polygon
(Ascend origin) · Costiuc BotW designer's analysis · Cantão climbing
recreation · New Frame Plus (climb animation) · Genshin wikis + KQM TCL
(measured) · Zelda wikis/zeldamods (Havok, horses, vessels) ·
longwintershadows (TotK trivialization analysis).
