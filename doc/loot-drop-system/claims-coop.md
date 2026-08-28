# Claims & co-op — gating, distribution models, loot locks

A claim is a transaction, not a pickup; and multiplayer loot needs an explicit
distribution model. All numbers are **starting points**. Tagged **[DOC]** /
**[WIKI]** / **[DATA]**.

## Claim gating

- **Kill-then-claim** (the Genshin model): the boss/ley line drops **nothing on
  death** — victory spawns a *claimable world object* (a blossom); the claim
  validates the energy spend (20/40/30–60 resin) server-side. You can complete
  the activity without paying (it counts for missions) but rewards stay locked.
  Condensed resin is a quantity multiplier on the same claim, never a rate change.
- **Why it's the structural anti-bot answer**: the kill is free, the *claim*
  costs a time-regenerated resource (`progression-economy`'s energy system) —
  botting beyond the quota yields nothing.
- **Idempotent claims**: same discipline as `progression-economy` grants — atomic
  flag+grant; if not transactional, **grant first, flag second** (a rare dupe
  beats a permanent loss). The observed server rejection of double-claims is the
  behavior to ship.
- **Solo claim model**: BotW's koroks/shrine chests are structurally identical —
  one persistent flag per location, content in data. Save-scumming is a *decision*:
  BotW accepts it (rolls at interaction, reroll on reload); a service game can't.
  The toolbox: roll-at-spawn + RNG-state-in-save, or explicit acceptance.

## Multiplayer loot distribution models

Choose a model per content type **[WIKI]**:

| Model | How | Enables / risk |
| --- | --- | --- |
| **FFA / shared** | anyone grabs ground loot | fastest; enables **ninja looting** |
| **Round-robin** | drops cycle assignment among the party | early MMO default; fair but impersonal |
| **Need-before-greed (Group Loot)** | roll Need (usable) vs Greed; Need wins | WoW's default; class-aware since 3.3.0 |
| **Master Looter** | one player loots & assigns | max control, max abuse; removed from most WoW content in BfA (8.0) |
| **Loot Council** | committee assigns by performance/attendance | guild raids; out-of-band |
| **DKP** | points earned by attendance, spent on drops | invented by EverQuest guild Afterlife (1999); largely obsolete |
| **Personal / instanced** | server assigns per-player, no contest | no ninja-looting; WoW dungeon default, Destiny/Borderlands co-op |

**WoW's loot-system history is a cautionary cycle** (group → personal → group):
Vanilla–MoP used Group/Master Loot + DKP; Legion–BfA pushed **Personal Loot** as
default and removed Master Loot (8.0.1) to kill ninja-looting; Shadowlands+
restored **Group Loot** because organized guilds wanted trade/control back. There
is no universally "right" model — pick per content and audience.

**Borderlands 3** ships both as a toggle: *Cooperation* (instanced, level-scaled,
unstealable) vs *Coopetition* (shared FFA, host-scaled, one pickup per item).

## The verified co-op matrix (Genshin)

Decide instanced-vs-shared **per category, explicitly** — the shipped model is
complete and HoYoverse-verified:

| Category | Rule |
| --- | --- |
| One-time world rewards (chests, oculi, investigation) | **host-only** (guests can't interact — no loss possible) |
| Enemy drops, ore | **instanced per player** (each sees their copy) |
| Plants/specialties | **shared** (first-come; one harvest per session) |
| Energy-gated claims (bosses, ley lines) | **instanced per player** — each claims with own resin; the boss respawns only after the LAST player claims and the blossom despawns |

The claim object holds per-player consumed flags. Decide every cell; never let it
emerge.

## Loot locks & weekly caps

- **WoW lockouts** **[WIKI]**: *loot-based* (kill any number of times, loot once
  per difficulty per week) vs *ID-based/strict* (Mythic raids tied to a fixed
  instance ID — can't swap to instances with bosses you've killed). Weekly reset
  Tue (NA) / Wed (EU).
- **The Great Vault** (weekly cap + soft pity): fill slots by activity count,
  **pick ONE item** at reset — multiple choices act as bad-luck protection. A
  fallback token currency converts unlucky weeks into deterministic value.
- **Boss loot pity** (drop-side, distinct from gacha currency pity — see
  [perception.md](./perception.md)): Destiny 2 raid exotics base ~5% per clear
  (Last Wish 10%, capped 50% @ ~20 clears; Deep Stone Crypt → guaranteed 100% @
  ~20–30 clears). Warframe publishes official drop tables with A-A-B-C rotations.

## Anti-farm bounds

- Delay-insensitive node cycles (you can't bank respawns).
- Daily interaction caps (Genshin: 400 elites/day then zero drops, 100
  investigations).
- **Claim gating** is the structural answer to bots (the kill is free, the claim
  costs a regenerating resource).
- The inverse lesson: Diablo III's 2013 gold dupe (an integer overflow in the
  auction house, billions duplicated) — shared economies need bounds AND audits
  (pitfalls #9, and see [compliance.md](./compliance.md) for server authority).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Genshin claim costs | ley line 20 / boss 40 / weekly 30–60 resin | wiki |
| Anti-farm caps | 400 elites/day then zero; 100 investigations/day | wiki |
| Destiny 2 raid exotic | base ~5% (1KV 10%); DSC → 100% pity @ ~20–30 clears | community |
| WoW reset | weekly Tue (NA) / Wed (EU); loot-based vs ID-based lockout | wiki |
| Warframe rotations | A-A-B-C in endless missions; published official tables | wiki |

## Flagged gaps — do NOT invent

Condensed resin 2-vs-3-set version divergence · BotW enemy-drop roll timing
(spawn vs kill — only chests/gambling/amiibo are documented roll-at-interaction)
· Destiny BLP per-raid increments (community-inferred).

## Sources

Grasscutter (Drop.json) · Genshin Fandom (Co-Op Mode, Ley Line Blossom, Resin,
Elite caps) · HoYoverse Help Center (co-op boss claims) · Warcraft Wiki /
Wowpedia (Lockout, Need Before Greed, DKP, Master Looter, Great Vault) · LootCalc
(Destiny 2 raid exotics) · Warframe Wiki (Mission Rewards / Drop Tables) · Gearbox
FAQ (Borderlands 3 modes) · Ars Technica (Diablo 3 gold dupe).
