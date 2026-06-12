# Attack graph — hits, damage, stagger, defense, feedback

The melee-action core: the data-driven attack graph, hit detection, the
damage pipeline, the stagger economy, the defensive kit, and feedback. All
numbers are **starting points — tune by playtest**. Primary reference:
Granblue Fantasy: Relink; calibration poles: Monster Hunter (commitment)
and DMC/Bayonetta (freeform). The ranged half is in
[ranged-gunplay.md](./ranged-gunplay.md); the RPG/turn-based/balance layer
in [rpg-combat.md](./rpg-combat.md).

## The attack graph

**Node** (one attack):

```
AttackNode {
  anim                       // clip/montage reference
  windows {                  // ALL authored as tags on the anim timeline
    hitbox[]                 //   active frames + shape + bone/socket
    cancel[]                 //   {type: dodge|guard|skill|jump|attack, frames}
    branch[]                 //   when next-input is accepted
    hyperarmor[]             //   uninterruptible frames
  }
  motionValue                // % of base damage (the balancing currency)
  damageCap?                 // per-node ceiling (Relink model, optional)
  costs / gains              // stamina, gauge build, resource feeds
  knockbackClass             // flinch | stagger-step | knockback | launch
}
```

**Edge** (transition): `{input, time window, predicate}` where predicates
include on-hit, on-whiff, resource ≥ X, mode active, charge held. Edges are
**priority-ordered** (composed inputs like `R+O` evaluated before the `O`
they contain) — this is verbatim how MH's `wp.fsm` weapon movesets work.
The same data-driven, priority-ordered transition-list pattern recurs in
the FFXII Gambit system and `enemy-ai-framework` intents
([rpg-combat.md](./rpg-combat.md)).

**Cancel semantics per edge** — preserve / reset / offset the string:
Relink ships both semantics (dodge preserves position in the string; guard
resets to index 0, used deliberately to loop strong segments). Make it a
data field, not a hardcoded rule.

**Scale proof**: Relink ships 21 characters = 21 graphs with radically
different kits (charge archetypes, personal gauges, modes) over one shared
data model (Cygames Tech Conference 2024, "21 types of game feel").

## Hit detection

- **Animation-driven, always**: active frames are interval tags on the
  timeline (UE `AnimNotifyState`, Unity animation events/Animancer). Never
  timers running parallel to the animation.
- **Shapes**: capsules/boxes attached to bones/sockets; multi-zone weapons
  (blade vs hilt) carry different hit properties.
- **Fast swings sweep**: cast the shape from last-frame socket transform to
  current — in-place overlap misses targets between frames (tunneling).
  *The same fix applies to fast projectiles* —
  [ranged-gunplay.md](./ranged-gunplay.md).
- **Hit registry**: per attack activation, a set of already-hit entity
  roots (not colliders — limbs duplicate); cleared on window open; declared
  multi-hit attacks re-arm at fixed intervals. (Ranged *intentionally*
  separates limbs into per-bone capsules for zone multipliers.)
- **Unified HitEvent**: `{attacker, target, attackData, contactPoint,
  normal, direction}` — same pipeline for melee and projectiles; direction
  drives directional hit reactions. This single stream is the whole reason
  one combat core serves melee + ranged.
- **Trades** are resolved by the stagger layer (hyperarmor/poise decide who
  flinches), not by hit detection.

## Damage pipeline

Canonical order (MH model, the most documented):

```
raw = baseAttack × motionValue%
    → attacker modifiers (buffs, sharpness, stance)
    → crit (×1.25 base; build-up to ×1.5)
    → type/element vs defenses (cut/blunt/ammo × per-part hitzone%)
    → part/weakpoint multiplier
    → defender modifiers (armor, boss mode state)
    → damage cap (per-node, if used)
    → rounding/display
```

- **Motion values** are the balancing currency: evaluate combos in MV/sec.
  Lights 20–50, heavies 50–80, charged finishers 100–180. (How MV sits
  inside the fuller RPG pipeline — stat scaling, variance, mitigation,
  crit EV — is in [rpg-combat.md](./rpg-combat.md).)
- **Damage caps (Relink's distinctive layer)**: each node carries its own
  ceiling; cap-up is an equipment stat. Endgame progression shifts from ATK
  (useless once capped) to cap raises. Purpose: bound DPS variance so
  endgame content stays balanced under stat inflation — the action answer
  to multiplicative damage blow-up ([rpg-combat.md](./rpg-combat.md)).
  Adopt only if you need long-tail gear progression.
- **Damage types feed secondary systems**: blunt-on-head builds KO (MH);
  every hit builds the stun gauge (Relink, scaled by a Stun stat). Ranged
  inserts distance falloff + hit-zone as upstream terms
  ([ranged-gunplay.md](./ranged-gunplay.md)).

## Stagger / poise / break — three separate mechanisms

1. **Flinch thresholds (per part)**: attacks carry poise damage; parts have
   flinch/break HP pools. Breakable parts = separate HP with rewards (loot,
   weakened hitzones) — the MH model.
2. **Accumulated stun gauge**: filled by sustained offense (and by perfect
   guards — defense feeding offense, Relink's loop); full gauge → a
   **vulnerability window** (Link Chance/KO). Anti-stunlock: threshold
   escalates +50–100% per proc, gauge decays ~5%/s after 3 s quiet. *This
   is structurally the same accumulate→proc→escalate shape as RPG status
   build-up meters and CC diminishing returns* —
   [rpg-combat.md](./rpg-combat.md).
3. **Boss state cycle (Relink/GBF)**: mode bar Normal → **Overdrive**
   (filled by damage taken; boss empowered, −10–30% damage taken) →
   **Break** (bar drained back to 0; no charge attacks, damage taken
   ×1.2–1.5, ≥10 s window). The state modulates the damage pipeline both
   ways and gates the boss AI's moveset.

**Poise vs hyperarmor**: poise = static stat absorbing interruptions
(Souls makes it a stat you gear for); hyperarmor = frames authored on
committed attacks (the trade-resolver). Both player and enemies use the
same model.

**The reward loop**: all three convert sustained aggression into
vulnerability windows — the moments the full combo graph gets to express
(free strings, charges, finishers). That's the structural reward that
motivates combos; without it, optimal play degenerates to poke-and-run.

## Defensive kit

All windows authored as frames on animations, parametrizable by equipment
(Relink's sigils widen dodge windows — plan for data-driven windows):

- **Dodge**: 25–40f total, i-frames the first 40–60%; chainable with
  growing vulnerability. The recovery tail is the skill-expression lever.
- **Perfect dodge**: dodge start overlapping an incoming hitbox →
  extended invincibility + pressure maintained; window 10–15f (~2× more
  lenient than parry, smaller reward).
- **Guard**: hold to negate, chip damage under-level, implicit guard gauge
  → guard break (temporary daze) on sustained blocking. Block-dodge
  composition as the safety net.
- **Perfect guard/parry**: 5–8f window; 0 damage, 0 chip, **+ stun damage
  to the attacker** (defense feeds the Link economy). Anti-spam: shrink
  the window on repeated whiffed attempts (Sekiro: 12f shrinking toward 0
  on spam) or lockout — no penalty produces a mash meta.
- **Hyperarmor**: interval tags on committed attacks.
- **Integration**: dodge/guard are cancel-target nodes reachable from
  nearly every attack node (Relink/Platinum: "never a time you can't
  dodge", with explicit exception flags like no-dodge-during-hit-stun);
  perfect variants reopen offensive edges immediately (frame advantage).
  MH inverts the philosophy with the same data model — fewer windows.
- **Projectile parry**: extend the perfect-guard window to test against
  incoming projectile hitboxes, optionally reflecting
  ([ranged-gunplay.md](./ranged-gunplay.md)).

## Skills & ultimate layer

- **Decoupled from the graph**: skills are `{slot, cooldown, resource}`
  that *interrupt* the graph (skill = near-universal cancel target) and
  return to neutral. Relink: 4-skill loadout + SBA (ultimate) gauge built
  by combat actions. (The MMO GCD + priority system and the turn-based
  action economy are this layer's cousins — [rpg-combat.md](./rpg-combat.md).)
- **Coupling happens through data, not code**: shared resources (combo
  finishers level Adept Arts which empower skills; skills chain into
  charge attacks as authored edges) — never by the skill layer reaching
  into graph internals.
- **A cancel interrupts the remaining EFFECT, not just the animation**
  (Relink patched the bugs where canceled skills kept their full effect).
- Gauge design rule: risk actions (perfect guards, on-hit) fill faster
  than safe ones; passive fill ≤ 20% of active fill.

## Party/link layer (the generic shape)

Relink's team mechanics reduce to three architectural pieces — relevant
even for future co-op:

1. **Individual gauges whose fill events broadcast to the party** (stun
   gauge full → Link Chance prompt party-wide).
2. **Synchronized windows** where simultaneous participation multiplies
   the reward (link attacks, SBA chains → Chain Burst scaling ×4).
3. **A temporary global state** (Link Time: enemy slow-mo + party buffs)
   modulating timescale and modifiers above individual systems.

Implementation: a combat event bus + a party coordinator — the per-
character combo graphs are untouched.

## Feedback layer

- **Hit-stop**: scale with damage (Smash: `⌊dmg×0.65+6⌋` frames, cap 30)
  rather than fixed per class. Scope: attacker+victim (fighting-game
  readability) — MH's attacker-only freeze is a deliberate exception that
  sells weapon weight. World-freeze reserved for finishers.
- **Screen shake**: trauma model (hits add 0.2–0.5 to a [0,1] trauma,
  amplitude = trauma², Perlin noise, 0.15–0.25 s ring-down, mostly
  positional, always a player slider) — GDC *Juicing Your Cameras*. The
  same model serves gunfire screenshake ([ranged-gunplay.md](./ranged-gunplay.md)).
- **Knockback in discrete tiers**, not a continuum: flinch (0 m) →
  stagger-step (~0.5–1 m) → knockback (2–3 m) → launch (3–5 m + air
  state).
- **Damage numbers**: scale display by % of target HP, not absolute;
  distinct crit/cap treatments (Relink's cap-slash VFX telling the player
  "raise your cap").
- Feedback consumes the HitEvent stream — it never lives inside damage
  math.

## Sources

MHW Modding Wiki (`wp.fsm` movesets, hitzone/part tables) · Fextralife
Relink wiki (Combat, Manual, Skybound Arts, sigils) · relink.gbf.wiki +
Nenkai relink-modding (damage caps, level sync datamines) · granblue.fandom
(Mode bar) · GDC 2018 NieR: Automata (Platinum, cancel tuning) · CritPoints
(commitment taxonomy) · SmashWiki/SuperCombo (hit-stop, buffers) ·
Fextralife souls wikis (i-frames, poise) · Game8/Kiranico MH (motion
values, KO thresholds, evade windows) · GDC 2016 Eiserloh *Juicing Your
Cameras* · Cygames Tech Conference 2024. Ranged sources in
[ranged-gunplay.md](./ranged-gunplay.md); RPG/balance sources in
[rpg-combat.md](./rpg-combat.md).
