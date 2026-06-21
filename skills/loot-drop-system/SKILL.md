---
name: loot-drop-system
description: >-
  Architecture blueprint for loot tables, world drops, respawn, claim gating,
  multiplayer loot, drop perception, and loot-box compliance across open-world,
  ARPG, looter-shooter, and MMO games. Covers weighted tables, guaranteed drops,
  magic find, scatter/despawn, personal/FFA loot, pseudo-randomness, odds
  disclosure, and anti-cheat. Use when designing drops, chests, nodes, respawn,
  drop rates, or when loot despawns, RNG feels rigged, rewards conflict, or odds
  need disclosure.
---

# Loot & Drop System

Build the loot layer of a game — layered tables, world distribution/respawn,
the drop pipeline, claim gating, drop perception, and (for monetized random
loot) regulatory compliance. The skill spans four traditions and tells you
which patterns are shared:

- **Open-world** (Genshin via Grasscutter drop data + verified co-op rules;
  BotW/TotK via datamined bdrop tables, ActorLimiter, revival policies).
- **ARPG / looter** (Diablo II Treasure Classes, magic find, D3 smart loot,
  D4 drop pools, PoE rarity/quantity — the depth references).
- **Multiplayer/MMO** (WoW loot-system history, Destiny 2 instanced drops,
  loot locks, master-looter vs personal vs group loot).
- **Monetized** (drop-rate disclosure law, loot-box gambling classification,
  server-authoritative anti-cheat).

Excluded (separate skills): deterministic pity/bad-luck *currency* economies
(`progression-economy`) and rolled item *stat generation* (substats live in
`inventory-equipment`). This skill owns the *drop event*, not the item's stats.

## The architecture rule

**Tables are layered data, drops are budgeted world objects, a claim is a
transaction — and in any monetized or online game the server rolls, never the
client.**

```
TABLES         weighted entries (integer weights) + null rows + sub-table refs
               + guaranteed slots; recursive (treasure classes); ilvl-gated
WORLD          one-time flags (never respawn) vs per-node timestamps vs
               policy-driven respawn; NOTHING respawns on screen
EXECUTION      data-driven scatter, settle-then-freeze, the max-live-drops budget
CLAIM          kill-then-claim; server-validated cost; per-player co-op state;
               idempotent (atomic flag+grant)
```

## Reference map

| File | Covers |
| --- | --- |
| [tables.md](./tables.md) | Layered weighted tables, the null entry, guaranteed slots, recursive treasure classes (D2), NoDrop player-scaling, ilvl/mlvl gating, magic find & rarity/quantity modifiers, conditionality (table selection, actor substitution), scaling without editing tables, the two datamined formats |
| [distribution.md](./distribution.md) | One-time placed vs spawned, per-node respawn timestamps, the three revival policies, the never-on-screen invariant, the execution pipeline (scatter, physics, pickup classes, despawn), the max-live-drops budget, rare-drop guards |
| [claims-coop.md](./claims-coop.md) | Kill-then-claim, server-validated cost, idempotent claims, the verified co-op matrix, multiplayer loot distribution models (personal/FFA/round-robin/need-greed/master-looter/loot-council/DKP), loot locks & weekly caps, anti-farm bounds |
| [perception.md](./perception.md) | The gambler's fallacy and drought math, pseudo-random distribution (PRD) with the C-table, drop-side bad-luck protection, shuffle-bags, drop ceremony and the "beam of disappointment", near-miss ethics, transparency and "guaranteed within X" |
| [compliance.md](./compliance.md) | Drop-rate disclosure (China/Korea law, Apple/Google policy, ESRB/PEGI labels), loot-box gambling classification by jurisdiction, server-authoritative anti-cheat for rolls, seed/replay protection, audit logging, the Nexon drop-rate-lie fine, a compliance checklist |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents (Weightgate, D3 gold dupe, Nexon, the despawned rare), debugging order, ship checklist |

## The co-op matrix (verified)

Decide instanced-vs-shared **per category, explicitly** — the shipped Genshin
model is complete:

| Category | Rule |
| --- | --- |
| One-time world rewards (chests, oculi) | **host-only** (guests can't interact — no loss possible) |
| Enemy drops, ore | **instanced per player** (each sees their copy) |
| Plants/specialties | **shared** (first-come; one harvest per session) |
| Energy-gated claims (bosses, ley lines) | **instanced per player** — each claims with own resin; the boss respawns only after the LAST player claims |

Full multiplayer distribution taxonomy (FFA / round-robin / need-greed /
master-looter / loot-council / DKP) in [claims-coop.md](./claims-coop.md).

## Build order (4 shippable tiers)

```
Tier 1 — Tables and rolling
- [ ] Layered table assets: weighted entries (integer weights), null rows,
      quantity ranges, sub-table refs, guaranteed slots
- [ ] Seeded per-system RNG stream (deterministic, serializable)
- [ ] Distribution tests: 10^6-roll chi-squared on REAL sampler output
- [ ] Server-side roll (or solo roll-at-spawn decision documented)
Tier 2 — World distribution
- [ ] One-time containers: persistent flags; atomic open
- [ ] Resource nodes: per-node timestamps; delay-insensitive cycles
- [ ] Reset policies per category + the never-on-screen check
Tier 3 — Execution pipeline
- [ ] Drop spawn: data-driven scatter, settle-then-freeze, water/edge policy
- [ ] Pickup classes (auto radius vs interact) + magnetism
- [ ] The live-drops budget: caps + oldest-eviction + rarity exemption
- [ ] Aggregated pickup feedback (hud-system); rarity beams/ceremony
Tier 4 — Claims, co-op, compliance
- [ ] Kill-then-claim: claimable objects, server-validated cost, per-player state
- [ ] The co-op matrix + the distribution model (personal/group/etc.)
- [ ] Perception: PRD or guaranteed-after-N if true-random feels "rigged"
- [ ] Monetized: published odds == rolled odds; audit log; regional gating
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| BotW live-drops budget | 10 items / 10 weapons / 20 enemy drops, oldest evicted, `PriorityMaterial` exempt | datamine |
| BotW respawn | blood moon ~168 min active (enemies); RevivalRandom 1%/60 s off-area (materials + ore) | datamine |
| D2 act-boss picks | 7 picks; NoDrop weight shrinks with player count | wiki |
| D2 magic find | effective = floor(Factor·MF/(Factor+MF)); Factor 250 U / 500 S / 600 R | wiki |
| D3 smart loot | ~85% class-tailored / ~15% random | D3 2.0.1 |
| PoE party scaling | +10% IIQ / +40% IIR per member (other drops); killing-blow counts | poewiki |
| Destiny 2 raid exotic | base ~5% (1KV 10%); Eyes of Tomorrow → 100% pity @ ~20–30 clears | community |
| PRD (Dota) | listed 25% → C≈0.0847, guaranteed by 12th try; >50% nominal diverges from actual | Dota 2 Wiki |
| Drought math | 10% drop: P(0 in 20 kills) ≈ 12%; 0.5%: P(0 after 100) ≈ 60.6% | math |
| Korea disclosure law | mandatory in-game + online odds, % form, since 2024-03-22 | Game Industry Promotion Act |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Tables | SO entries (`[SerializeReference]` polymorphism), `OnValidate` weight totals | DataTable + `FDataTableRowHandle`; Composite DataTables for overrides; Instanced Structs (5.5) |
| Sampling | linear scan ≤~100 entries; alias method O(1) for huge tables — integer weights | same; server rolls, client renders |
| RNG | `Unity.Mathematics.Random` (seedable, per-system streams) | `FRandomStream` (replicate results, not streams — call-order desync trap) |
| Drop spawning | `UnityEngine.Pool.ObjectPool<T>`; impulse scatter | no first-party actor pooling (subsystem pattern); runtime actors NOT unloaded by World Partition |
| Co-op | Mirror/NGO ownership filtering | server loot list + per-client RepNotify visibility |

Full detail in the reference files.
