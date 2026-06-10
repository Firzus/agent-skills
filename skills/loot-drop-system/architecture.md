# Architecture — tables, distribution, execution, claims

The components of a production loot/drop system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary sources: zeldamods (DropTable/bdrop, ActorLimiter, Object
respawning), Grasscutter drop data, the Genshin wiki Loot System
pages, HoYoverse official support (co-op claims), Lostgarden/Game
Developer (the industry table canon), Diablo II Treasure Classes (one
comparison line).

## Layered tables

### The canonical structure

- **A table is a bucket of weighted entries** — integer weights, not
  percentages (sum the weights, roll in [1..sum]); the **null entry**
  ("nothing drops") is a first-class weighted row; quantity ranges
  per entry; an entry can reference **another table** (recursive
  roll). Optional no-replacement modes with refresh periods cap
  daily yields at the table level. (Lostgarden/Game Developer — the
  industry reference; Diablo II's Treasure Classes are the genre
  canon: recursive `TreasureClassEx` with Picks, NoDrop weight
  shrinking with player count, and slots pointing to items or other
  TCs.)
- **Guaranteed slots stack alongside chance slots**: BotW's enemy
  tiers don't raise drop percentages — a Silver Bokoblin *adds*
  tables of 100%-guaranteed rolls (more rolls = more and rarer
  items). Genshin's boss gems roll in two independent passes (one
  exclusive rarity roll + level-dependent "drop packs"). Multiple
  independent rolls per kill is the shipped norm.
- **Shared sub-tables kill drift**: common sub-tables
  (`CommonOres`, `RegionalHerbs`) referenced by many parents with
  thin regional overrides — UE5's Composite DataTables implement
  exactly this.

### The two datamined formats

- **BotW bdrop**: per-actor file with named tables; each table =
  `RepeatNumMin/Max` (roll count) + item/probability pairs whose
  probabilities **must sum to 100.0** (broken sums silently fail
  drops), plus drop physicalization params (`ApproachType` position
  mode, `OccurrenceSpeedType` ejection velocity) — the scatter is
  table data.
- **Grasscutter (Genshin)**: per-monster entries with
  `minCount/maxCount` and **weight windows on a 0–10,000 scale**
  (`minWeight/maxWeight` — one roll partitioned into intervals).

### Conditionality: three mechanisms

1. **Condition fields in entries** — the industry default; scales
   poorly (the 100-condition table).
2. **Table selection by context** (BotW): the *death mode* picks the
   table — `Normal`, `Iced`, `Burnout`, `Boiled` (frozen kill drops
   frozen meat; fire kill drops cooked), per-ammo tables for archer
   enemies. The conditional lives in the table *name*, legible to
   designers.
3. **Actor substitution** (both games): BotW tiers (Red→Silver) are
   *different actors* with their own bdrops — with the documented
   consequence that low-tier items go **extinct** late-game (a real
   design trade-off to decide); Genshin ships **multiple monster
   IDs** (a quest variant without drops vs the overworld variant) —
   the conditional resolved by instantiation, not by table fields.

Prefer (2) + (3): data-driven, auditable, no condition spaghetti.

### Scaling without editing tables

Genshin's model (wiki-documented): reward tiers are a **piece-wise
function of enemy level** (one tier per 5 levels; mean(tier) =
mean(max) × (tier/30 + 0.4), capped at 1). World Level just moves
enemies across tiers. Probability and material tier scale (masks
16.81% → 42.02%; tier-2 materials unlock at 40+, tier-3 at 60+);
**quantity stays flat**. The lesson: scaling is a layer *over* the
tables, never an edit *of* them.

### The WYSIWYG drop

BotW's held weapons ARE the drop (the equipment is a world actor, not
a table entry) — visible loot, zero surprise. Worth one design line
in any system: separate "carried equipment drops" from "table drops".

## World distribution & respawn

- **One-time placed**: chests, oculi, koroks — persistent ID flags in
  the save, **never respawn** (verified for both games; Genshin's
  "late-appearing" chests are quest-masked, not respawned). BotW's
  900 korok flags are the structural model.
- **Resource nodes**: per-node real-time timestamps — Genshin plants/
  specialties 48 h *from harvest*, crystals 72 h; the datamined
  nuance: ordinary ores anchor to 0:00 server with **per-spot cycles
  insensitive to late mining** (you can't bank respawns by delaying
  harvest — copy this).
- **Enemies/weapons — a reset policy per category** (the BotW
  datamine): `RevivalBloodyMoon` (enemies + weapons, flags reset at
  the ~168-min-active-play event), `RevivalRandom` (materials AND ore
  deposits: a 1% check every 60 s, **only while the player is in a
  different map area**), `RevivalRandomForDrop` (containers),
  `RevivalNone` (uniques). Genshin: commons 12–24 h, elite groups at
  daily reset, bosses ~5 s after the *claim* (not the kill).
- **The never-on-screen invariant is structural**, not cosmetic:
  BotW's RevivalRandom embeds the area check; the blood moon
  ritualizes mass respawn into fiction (a cutscene at midnight —
  the reset becomes lore).
- **Anti-farm bounds**: delay-insensitive node cycles, daily
  interaction caps (100 investigations; **400 elites/day** then zero
  drops — the verified overworld bound), and claim gating (§ below)
  as the structural answer to bots.

## The execution pipeline

- **On death**: evaluate the context-selected table, roll RepeatNum
  items, spawn with data-driven position/impulse. Physics:
  impulse caps, **settle-then-freeze** (kinematic after rest),
  no-physics zones near cliffs, and a water policy — BotW's is
  per-material (wood floats, metal sinks + a recovery tool); without
  a Magnesis equivalent, float-or-teleport-ashore is the pragmatic
  guard.
- **Pickup classes**: auto-by-contact for currency/orbs; interact for
  materials (the observed Genshin split — the exact class boundary
  is unverified, flagged; no generalized native auto-pickup exists,
  it remains a top player request). Magnetism: lerp toward the
  player after radius detection, speed proportional to distance.
- **Despawn — the idle/drop distinction** (BotW, community-verified):
  a *placed* item is idle (persists across loads, restored by blood
  moon); once it becomes a *drop* (picked up and discarded, or
  carried by an enemy), it **despawns on area unload**. Genshin
  drops time out (~10–15 min community estimate — flagged).
- **The live-drops budget exists literally in shipped data**: BotW's
  ActorLimiter caps simultaneous actors per list — 10 dropped items,
  10 player-discarded weapons, 20 enemy drops, 15 amiibo drops —
  evicting the oldest, **except actors tagged `PriorityMaterial`**.
  Copy the whole pattern: caps + oldest-eviction + a rarity/priority
  exemption (and resolve the eviction-vs-protection conflict
  explicitly: merge commons into stacks, evict commons before
  touching rares).
- **Rare-drop guards**: no despawn above a rarity threshold (Diablo
  II's graded timers — 10 min common / 30 min rare — are the
  historical precedent), beam VFX by rarity, minimap ping. The
  Destiny 2 Postmaster counter-example: a safety net with silent
  FIFO eviction (20 slots) recreates the loss it prevents.
- **Feedback contracts** (`hud-system`): aggregated pickup toasts
  ("Iron Chunk ×5" over a 1–2 s window), the chest-opening ceremony,
  the claim screen for gated rewards. The loot system emits events
  (`item_granted`, `chest_opened`, `claim_available`); the HUD
  renders.

## Claim gating

- **Kill-then-claim** (the Genshin model): the boss/ley line drops
  **nothing on death** — victory spawns a *claimable world object*
  (a blossom); the claim validates the energy spend (20/40/30-60
  resin) server-side. You can complete the activity without paying
  (it counts for missions) but rewards stay locked. Condensed resin
  is a quantity multiplier on the same claim (2 sets), never a rate
  change.
- **Why it's the structural anti-bot answer**: the kill is free, the
  *claim* costs a time-regenerated resource (`progression-economy`'s
  energy system) — botting beyond the quota yields nothing. The
  inverse risk is documented: Diablo 3's 2013 gold-dupe (an integer
  overflow in the auction house) showed what an unbounded shared
  economy without audit costs.
- **Per-player claim state in co-op** (HoYoverse-verified): every
  player claims with their own resin; the boss respawns only after
  the **last** player claims and the blossom despawns. The claim
  object holds per-player consumed flags.
- **Idempotent claims**: same discipline as `progression-economy`
  grants — atomic flag+grant; if not transactional, **grant first,
  flag second** (a rare dupe beats a permanent loss). The observed
  server rejection of double-claims ("entity has timed out") is the
  behavior to ship.
- **Solo claim model**: BotW's koroks/shrine chests are structurally
  identical — one persistent flag per location, content in data.
  Save-scumming is a *decision*: BotW accepts it (rolls happen at
  interaction and reroll on reload — documented amiibo/gambling
  practice); a service game can't. The toolbox: roll-at-spawn +
  RNG-state-in-save, or explicit acceptance.

## Flagged gaps — do NOT invent

Genshin pickup radii (no public measurement) · the exact
auto-vs-interact class boundary and its version history · Genshin
drop despawn timer (~10–15 min community only) · toast/chest-ceremony
timings · generic engine pickup budgets (ActorLimiter is the only
shipped anchor) · the fine structure of the newer
`DropTableExcelConfigData` · condensed resin 2-vs-3-set version
divergence · BotW enemy-drop roll timing (spawn vs kill — only
chests/gambling/amiibo are documented roll-at-interaction) · a
dedicated GDC loot-tables talk (none found — Lostgarden/D2 TC serve
as the canon) · "rares never despawn" as a universal practice (it's a
recommendation; D2 grades timers, D4 has despawn bugs).

## Sources

zeldamods (ActorParam/DropTable, ActorLimiter, Object respawning,
ActorLink) · MrCheeze's all_drops dump · Grasscutter (Drop.json
commits, discussions) · Genshin Fandom (Loot System + Material Drop
Distribution, Chest, Reset, Ley Line Outcrop/Blossom, Co-Op Mode,
Original/Condensed Resin, Elite Enemy caps, Investigation) ·
HoYoverse Help Center (co-op boss claims) · Lostgarden (Daniel Cook,
loot drop tables) · Game Developer (loot best practices) ·
PureDiablo/d2r-tools (Treasure Classes) · GameFAQs (idle-vs-drop
despawn, double-claim rejection) · Zelda Wiki (Silver Lynel tables,
buoyancy) · Game8/GameWith/DiamondLobby (co-op rules) · Kotaku
(amiibo save-scumming) · GameSpot/Kotaku (Destiny 2 Weightgate) ·
Ars Technica (Diablo 3 gold dupe).
