# Mounts & vehicles — bonding, flight, build-your-own, crews

Covering ground at scale. All numbers are **starting points**; community-wiki
figures flagged `[?]`. Sources: RDR2 dev talks, Ueda interviews, WoW patch notes.

## Mount handling & bonding — "the horse as a character"

- **RDR2 — the deepest bonding sim**: four **bond levels** (XP from riding calmly,
  feeding, grooming, calming, winning races); each level grants a stat bump + one
  maneuver (L2 rearing, L3 skid turn, L4 piaffe + drift). Bond also extends the
  downed-horse revive window `[?]`. Dev-confirmed realism: gait transitions are
  continuous accel/decel synced to foot placement (deliberate "wriggle room" so the
  horse never feels 100% player-controlled); runtime sampling of terrain/weather →
  bespoke animation layers; a self-preservation AI that edge-stops at manually-marked
  cliffs. Praised for fidelity; criticized as heavy/unresponsive by design.
- **The Witcher 3 — Roach**: auto-follow on roads (breaks on untagged paths); a
  fear/panic meter near combat (mitigated by Blinders or the Axii sign). (The
  "intentionally buggy Roach" story is a CDPR April Fools joke — **do not cite as
  fact**.)
- **Shadow of the Colossus — Agro, the emotional template**: **indirect control by
  design** — you spur and rein, never steer directly; Agro takes initiative and
  refuses cliffs. Ueda's framing: "a partner… a second set of legs". **The design
  lesson**: the distance between input and animal *is* the personality and the
  pathos — the control friction is the artistry. Directly seeded The Last Guardian.
- **BotW/TotK**: taming costs Link's stamina; bond 0–100 (below 100 the horse
  disobeys; at 100 it auto-follows roads); stamina stars = gallop spurs; max 5
  stable slots. TotK adds a Pull stat and the Horse God revive.

**The recurring pattern**: indirect/semi-autonomous control creates personality and
emotional bond (Ueda, the Rockstar animation talk) — a fully player-controlled
mount feels like a vehicle, not a character.

## Mounts as progression / collection

- **WoW speed is riding skill, not the mount**: Journeyman +100% ground (level 10),
  Expert/Master flight +220%/+420%, **Skyriding** a momentum/stamina-based flight
  layer (pitch for speed, vigor charges) answering "flying is too passive". **~900+
  mounts** as a horizontal collection grind — rarity as status (Invincible ~1%
  weekly-lockout, Big Love Rocket ~0.03%), a long-tail retention engine independent
  of power.

## The flying-mount trivialization debate

The central tension (Blizzard, dev-stated): once players fly, *they* control how
they engage the ground — where ~all content lives — and "all design and
presentation becomes meaningless". Flight bypasses hazards/topography and forces
full 3D world-building. WoW's **Pathfinder gating** (flight withheld until late) is
defended as protecting ground design and criticized as an artificial retention
grind.

**The middle-ground answers**:

- **Elden Ring — Torrent**: *not* free flight — a **double-jump** (1×, redirectable)
  + **Spiritsprings** (geyser updrafts you ride upward; landing near one negates all
  fall damage; ×0.7 fall damage mounted). Vertical traversal and shortcut descents
  *without* trivializing the world — you still ride the ground. The praised gold
  standard for "verticality without flight".
- **Horizon Forbidden West — Sunwing**: the only flying mount, gated to the
  penultimate quest (~level 32) — let players experience the ground-designed world
  first, hand flight over near the end as a victory lap.
- **Gliding vs flying**: gliding (BotW paraglider, Just Cause) *spends* altitude
  and demands terrain knowledge; flying is free vertical and trivializing.
  Designers favor gliding/spring-jump because **the constraint preserves the world**.

## Vehicle traversal

- **Death Stranding** — vehicles (trikes/trucks) extend capacity but are
  **terrain-gated** (useless on mountains without pre-built roads); the chiral
  network co-builds roads/zip-lines (zip-lines become a minimum-spanning-tree
  optimization). DS2's earlier/easier vehicles diluted the original's on-foot
  tension — the cautionary note.
- **TotK Zonai — build-your-own**: Ultrahand glues parts; Autobuild re-summons
  blueprints from materials/Zonaite; the **physics constraints are the game**
  (weight/center-of-gravity, battery drain, wing balance). The emergent meta is the
  Hoverbike (2 fans + steering stick) — a generative sandbox bounded by battery and
  part count.
- **Just Cause — the momentum loop**: grapple + parachute + wingsuit cycle =
  effectively infinite flight by skill (**slingsuiting** is the only way to gain
  upward velocity in the wingsuit); the most kinetic open-world traversal, where
  momentum mastery is itself the reward.
- **Driving handling**: the arcade↔simcade↔sim spectrum — physics-first (remove
  complexity from a full sim) vs arcade (add mechanics until it "feels good"). The
  **tire model is the crux**: sims use the Pacejka "Magic Formula" (slip angle +
  load → force), so understeer/oversteer *emerge* from tire forces + weight
  transfer; arcade uses binary grip and "brake-to-drift". No game simulates full
  fidelity.

## Multi-crew / cooperative traversal

- **Sea of Thieves** — the ship is a **shared vehicle** needing distributed roles
  (helm, sails, capstan/anchor, navigation, lookout, repair). Two sail controls
  (**length** = wind caught, **angle** = align to wind, with a flap/stretch + audio
  cue when optimal); ship classes trade speed for crew load (Sloop best into
  headwind, Galleon fastest with tailwind but hardest). **Coordination friction *is*
  the content** — anchor-turning and sail trim in battle create emergent crew drama.

## Traversal-as-loop vs traversal-as-utility

The structuring axis — **"is the journey the point, or the obstacle?"**:

- **Journey = the point (Death Stranding)**: traversal *is* the game — route
  optimization, cargo weight + center-of-gravity balance, terrain as antagonist,
  end-of-mission scoring on weight/speed. The friction is the dopamine.
- **Journey = utility (most open worlds)**: mounts/fast-travel exist to *minimize*
  traversal friction so you reach content — at the risk of trivializing the world.
- **The middle path (Elden Ring/BotW/Just Cause)**: traversal is utility but kept
  engaging via constraint. **The design takeaway**: the axis is set by where the
  friction lives — remove all friction → content-delivery utility; make friction the
  dopamine → traversal-as-game. Pick a side deliberately (the criticized cases — WoD
  permanent no-fly, DS2 over-easy vehicles — misjudged how much friction their
  audience wanted).

## Flagged gaps — do NOT invent

RDR2 per-level stat deltas and revive timers are community-wiki, not Rockstar-
confirmed · the Witcher "intentional bugs" is a confirmed joke (exclude) · WoW mount
totals drift per patch (~863–906) · "no-fly zones = 2D sprites" is analyst
interpretation.

## Sources

Game Developer (Rockstar's horse animation talk; Designing Agro) · shmuplations
(Ueda interviews) · Warcraft Wiki / official patch notes (mount speeds, collection)
· Eldenpedia / Fextralife (Torrent, Spiritsprings) · Game Developer (Death Stranding
design; racing handling models) · Game8 (TotK Zonai devices) · Red Bull (Just Cause
slingsuiting) · Sea of Thieves Wiki + release notes (sailing).
