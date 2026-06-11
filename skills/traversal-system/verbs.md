# Verbs — the catalog, climbing, air, water, parkour

Each verb is a self-contained module (the Capabilities pattern). All numbers are
**starting points**. Sources: GDC BotW/TotK talks, Genshin/KQM, and the parkour
canon (Mirror's Edge, Titanfall 2, Spider-Man).

## The declaration contract (per verb)

- **required world data** (surface tags / volumes / anchors / nothing)
- **controller services** (gravity off, collision profile — TotK Ascend ignores
  ceiling collision —, normal reorientation, motion warping)
- **costs** (drain/s, per-action bursts, alternate pools)
- **animation set + IK policy**
- **interrupt contract** (what cuts me, exit state, what buffers through)

**Granting**: progression (paraglider, Ascend), equipment/gadget (Sorush), region
(Fontaine diving — gating expressed as a world-data requirement satisfiable only
there), temporary blessing.

## Climbing

- **BotW**: any unmarked surface; speed/drain scale with slope angle; climb-jump =
  distance burst for a big stamina cost; overhangs = release (normal past
  threshold). Rain adds a cyclic slip-back (~3–5 steps then slip) — **deliberately
  beatable** by timing jumps before the slip.
- **Genshin**: slower steadier drain, no rain slip (a deliberate trade); the food
  economy replaces weather as the lever.
- **TotK Ascend**: born as a debug command, promoted because "cheating can be fun"
  — the designed shortcut-solver that fixes BotW's overhang wall. Real cost:
  validating every ceiling.
- **Corners**: outside 90° = wrap-probe past the edge, slerp the climb frame over
  ticks; inside = blend/pick dominant normal, clamp lateral input (pitfalls #3).

## Air traversal

- **Glide = energy conversion**: altitude (spent stamina) → horizontal distance.
  Updrafts reset the loop. The **paraglider moment** — grant the descending verb
  *after* the cost of ascent is felt (the world-opening item gate).
- **Vertical bursts** (Revali's Gale, rockets): updraft-on-demand on a cooldown —
  extends the jump button, bypasses rain, resource-limited so climbing stays
  relevant.
- **Chains**: jump→glide→dive — demands clean interrupt contracts and buffered
  inputs across aerial verbs.

## Water traversal

- **Two models**: the classic surface swim (stamina wall — depletion = drowning)
  vs **Fontaine free-3D underwater** (separate non-upgradable Aquatic Stamina
  draining only on sprint, **no drowning** — water becomes a space, not a barrier).
- Architecture: water = volume + current splines; verbs declare which currents
  they consume. **Combat verbs reused as traversal** (Cryo freezing a crossing) —
  the multiplicative-design example.

## The parkour / momentum verbs

The opposite-economy school (see [SKILL.md](./SKILL.md)): speed is accumulated and
protected, not spent.

- **Wall-run** must be *incentivized*, not just possible: Titanfall's fix was a
  **speed boost on the wall-run itself** ("why wall-run when you can run around?").
  Wall-run speed **rises over time**, mechanically rewarding starting the next move
  as soon as the current ends — manufacturing the never-stop loop ("you're safest
  at speed"). Chaining techniques: slide-hop, bunny-hop, air-strafe (Source
  lineage). Implementation in [implementation.md](./implementation.md).
- **Free-running (Assassin's Creed)** — the automation-vs-expression case study:
  AC1's "hold one button, climb anything" (low floor, but "the game playing
  itself"); Unity's **parkour-up / parkour-down** split (directional intent — hold
  up → jump to the higher beam, down → the lower) to restore control; the
  documented **backlash** ("automated systems taking priority… one movement is
  expected, but another comes out, throwing off the route"); Mirage's deliberate
  "return to roots" (Ezio-style flow, pole-vault, verticality). The lesson:
  automation buys accessibility and spectacle at the cost of player expression.
- **Web-swinging (Spider-Man)** — a **pendulum, not flight** ("it needed to be like
  swinging"). The **release point is the skill mechanic** (release later → launch
  up/forward; earlier → vector to street level). The toolkit: web-zip, point-launch
  (spring off lampposts), seamless swing→wall-run→off-wall. "Custom hero states"
  drive the swing (faked/tuned physics for feel over realism); the anti-faceplant
  rule ("slam into a building, you keep running up it"). Spider-Man 2's web-gliding
  nearly failed playtesting — grapple/swing feel is fragile and playtest-driven.
- **Coyote-time & buffering** are the invisible flow enablers (a jump still fires
  ~80–150 ms after leaving a ledge, or buffered ~0.1 s before landing) — "bridge
  the gap between computer timing and human reaction time" (Celeste).

## Buffering & terminal policy (both schools)

- **Buffering across verbs**: ~100–120 ms buffer through transitions,
  clear-on-consume, explicit priority; re-entry refractory (~200–300 ms) after
  climb→jump to kill re-grab loops (pitfalls #4).
- **Terminal stamina policy** (stamina school): a grace window (~0.5–1 s), auto-
  ledge-grab in reach, or slide-not-fall on non-overhangs (pitfalls #5).
- **Momentum-loss feedback** (parkour school): communicate fatigue *through a loss
  of momentum*, not a stamina bar (Mirror's Edge); stopping is a level-design
  failure, not player error.

## Flagged gaps — do NOT invent

Titanfall 2 per-move boost values (30 mph is the dev-stated ceiling; per-move
unpublished) · Sekiro grapple range (point-locked, reach not sourced) · BotW climb
m/s and glide ratios (only relative modifiers citable) · Genshin current/waverider
speeds.

## Sources

GDC BotW/TotK talks · Genshin wikis + KQM · Game Developer (Mirror's Edge, Titanfall
2, Spider-Man traversal) · IGN (AC parkour evolution, Pedneault) · GameGrin (AC
Unity automation critique) · Insomniac dev talks (web-swing physics).
