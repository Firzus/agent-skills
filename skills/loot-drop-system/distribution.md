# Distribution — world placement, respawn, execution

How drops reach and persist in the world. All numbers are **starting points**;
flagged gaps at the bottom. Primary sources: zeldamods (ActorLimiter, Object
respawning), the Genshin wiki Loot System pages, Diablo II despawn timers.

## World distribution & respawn

- **One-time placed**: chests, oculi, koroks — persistent ID flags in the save,
  **never respawn** (verified for Genshin and BotW; Genshin's "late-appearing"
  chests are quest-masked, not respawned). BotW's 900 korok flags are the
  structural model.
- **Resource nodes**: per-node real-time timestamps — Genshin plants/specialties
  48 h *from harvest*, crystals 72 h; the datamined nuance: ordinary ores anchor
  to 0:00 server with **per-spot cycles insensitive to late mining** (you can't
  bank respawns by delaying harvest — copy this).
- **Enemies/weapons — a reset policy per category** (the BotW datamine):
  - `RevivalBloodyMoon` — enemies + weapons; flags reset at the ~168-min-active-play
    blood-moon event.
  - `RevivalRandom` — materials AND ore deposits: a 1% check every 60 s, **only
    while the player is in a different map area** (guides claiming blood moon for
    ore are wrong).
  - `RevivalRandomForDrop` — containers; `RevivalNone` — uniques.
  - Genshin: commons 12–24 h, elite groups at daily reset, bosses ~5 s after the
    *claim* (not the kill).

## The never-on-screen invariant

Structural, not cosmetic: BotW's RevivalRandom embeds the area check; the blood
moon ritualizes mass respawn into fiction (a midnight cutscene — the reset
becomes lore). Always test area/frustum visibility before any respawn (pitfalls
#6).

## The execution pipeline

- **On death**: evaluate the context-selected table, roll RepeatNum items, spawn
  with data-driven position/impulse. Physics: impulse caps, **settle-then-freeze**
  (kinematic after rest), no-physics zones near cliffs, and a water policy —
  BotW's is per-material (wood floats, metal sinks + a recovery tool); without a
  Magnesis equivalent, float-or-teleport-ashore is the pragmatic guard.
- **Pickup classes**: auto-by-contact for currency/orbs; interact for materials
  (the observed Genshin split — the exact class boundary is unverified, flagged).
  Magnetism: lerp toward the player after radius detection, speed proportional to
  distance.
- **Despawn — the idle/drop distinction** (BotW, community-verified): a *placed*
  item is idle (persists across loads, restored by blood moon); once it becomes a
  *drop* (picked up and discarded, or carried by an enemy), it **despawns on area
  unload**. Genshin drops time out (~10–15 min community estimate — flagged).

## The max-live-drops budget

The budget exists literally in shipped data: BotW's **ActorLimiter** caps
simultaneous actors per list — 10 dropped items, 10 player-discarded weapons, 20
enemy drops, 15 amiibo — evicting the oldest, **except actors tagged
`PriorityMaterial`**. Copy the whole pattern:

- caps + oldest-eviction + a rarity/priority exemption;
- resolve the eviction-vs-protection conflict explicitly: merge commons into
  stacks, evict commons before touching rares;
- in UE5 every replicated drop costs network bandwidth — the cap is also a net
  budget.

## Rare-drop guards

- No despawn above a rarity threshold (Diablo II's graded timers — 10 min common
  / 30 min rare — are the historical precedent).
- Beam VFX by rarity, minimap ping (the drop ceremony — see
  [perception.md](./perception.md)).
- A position-validation raycast at settle (no falling through floors).
- **The Destiny 2 Postmaster counter-lesson**: a safety net with silent FIFO
  eviction (20 slots, exotics overwritten) recreates the loss it was meant to
  prevent (pitfalls #5).

## Feedback contracts

The loot system emits events (`item_granted`, `chest_opened`, `claim_available`);
the `hud-system` renders. Aggregate pickup toasts ("Iron Chunk ×5" over a 1–2 s
window — pitfalls #13); the chest-opening ceremony is non-blocking; the claim
screen handles gated rewards (see [claims-coop.md](./claims-coop.md)).

## Streaming & persistence

- **UE5 World Partition does NOT unload runtime-spawned actors** (Epic guidance:
  manage lifetime manually — destroy on cell unload, respawn via in-cell
  spawners). Parent drops to cell lifetime.
- Node timestamps + flag sets live in the save (`save-persistence`).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Live-drops budget | 10 items / 10 weapons / 20 enemy drops / 15 amiibo, oldest evicted, `PriorityMaterial` exempt | BotW datamine |
| Blood moon | ~168 min active play (enemies + weapons) | datamine |
| RevivalRandom | 1%/60 s off-area (materials + ore) | datamine |
| Genshin nodes | plants 48 h, crystals/fishing 72 h, commons 12–24 h, bosses ~5 s post-claim | wiki |
| Chest tiers | 0–2 / 2–5 / 5–10 / 10–40 primogems; never respawn | wiki |
| Rare-drop timers | D2: 10 min common / 30 min rare (historical) | community |

## Flagged gaps — do NOT invent

Genshin pickup radii (no public measurement) · the auto-vs-interact class
boundary · Genshin drop despawn timer (~10–15 min community only) ·
toast/chest-ceremony timings · generic engine pickup budgets (ActorLimiter is the
only shipped anchor) · "rares never despawn" as universal practice (it's a
recommendation; D2 grades timers, D4 has despawn bugs).

## Sources

zeldamods (ActorLimiter, Object respawning, ActorLink) · MrCheeze all_drops dump
· Genshin Fandom (Loot System, Reset, Chest) · GameFAQs (idle-vs-drop despawn) ·
Zelda Wiki (buoyancy) · PureDiablo/d2r-tools (despawn timers) · Epic docs (World
Partition runtime-actor lifetime) · GameSpot/Kotaku (Destiny 2 Postmaster).
