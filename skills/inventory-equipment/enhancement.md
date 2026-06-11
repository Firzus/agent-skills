# Enhancement — the unified upgrade service

One service, per-type tables. Grasscutter ships exactly this (one
`InventorySystem` carrying weapon and reliquary upgrade paths, emitting
item-change packets and a level event). All numbers are **starting points**.

## The service shape

```
EnhanceService.feed(target, fodder[]) ->
  { expGained, moraCost, leftoverRefund, levelUps[], rollEvents[] }
```

One entry point; per-type policies branch inside. Never duplicate the upgrade
loop per item category — that's how the two paths drift.

## Per-type tables

- **Artifact tables (Genshin)**: fodder by rarity 420/840/1,260/2,520/3,780 EXP;
  5★ +0→+20 = 270,475 EXP at 1 Mora per EXP; recycling = base + **80% of invested
  EXP** (the 20% tax), recycled EXP costs no Mora; an EXP crit (90% ×1 / 9% ×2 /
  1% ×5 — mean ×1.13) as RNG delight in a deterministic system; EXP books
  2,500/10,000; salvage converts leveled 5★ back into books at 100% (remainder
  carried).
- **Weapon tables**: same recycling rate (80%), but **overflow refunds as ores**
  (artifacts just lose it — per-type policy); 1 Mora per 10 EXP; ascension caps
  interleave (`progression-economy`).
- **Roll events**: artifact rolls fire at +4 thresholds (new line or equiprobable
  upgrade — see [gear-generation.md](./gear-generation.md)); weapons just level.

## Batch QoL (the shipped chronology)

The Genshin curve, as a feature-ordering guide: auto-add ≤4★ (1.1) → 15-item
batches + enhance-to-next-tier + optional 5★ fodder (4.3) → press-and-hold (4.7).

- **Locked/equipped items are excluded at the *model* level** (the
  `isDestroyable` invariant), not filtered in the UI.
- Add a **confirmation on high-value fodder** (max rarity, leveled, premium
  substats) — the single most support-ticket-saving guard (pitfalls #3).
- Batch fodder cap ~15 (community-sourced).

## Dissolve / salvage loop

- **Batch destroy** up to 100 (level +0, 1–4★ only, 5★ indestructible); auto-add
  rules mirror the lock plans (auto-mark = the inverse of auto-lock).
- **Recycle-into-value** is the key anti-flood pattern: the strongbox (3×5★ →
  1×5★ of a chosen set) returns *acquisition* value, not just slots; salvage
  converts leveled trash into EXP books at 100%. The recycle loop must match the
  drop loop's speed (pitfalls #4).
- **ARPG salvage**: items break into crafting mats at a smith — the primary
  inventory-clearing path alongside sell. **Mass-salvage safety is critical**: D4
  S4 changed "Salvage All" to destroy everything not equipped *or favorited*
  (including Legendaries), making favoriting mandatory. Scope bulk ops to the
  active tab ("Sell All Junk" sells only the current tab's Junk). See
  [inventory-ui.md](./inventory-ui.md).

## The preview honesty rule

Never present unrolled RNG as a single number. Show **ranges** ("a random substat
will gain 7.0–9.3") and exact values only for deterministic outcomes (EXP gained,
resulting level — what Genshin shows). A lying preview makes players suspect
cheating (pitfalls #12).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Artifact fodder EXP | 420/840/1,260/2,520/3,780 | wiki |
| 5★ +20 total | 270,475 EXP and Mora (1:1) | wiki |
| Recycling | base + 80% of invested EXP (recycled EXP costs no Mora) | wiki |
| EXP crit | 90% ×1 / 9% ×2 / 1% ×5 (mean ×1.13) | wiki |
| Batch fodder cap | ~15 | community |
| Dissolve cap | 100 (1–4★, level +0) | wiki |

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Enhance service | one C# service emitting change events | one subsystem; GAS for resulting stat changes |
| Stat application | recompute pipeline (`progression-economy`) | equip = infinite GameplayEffect; never `SetNumericAttributeBase` directly |
| Online | server-authoritative roll; client shows ranges | server roll; idempotent feed transaction |

## Sources

Grasscutter (`InventorySystem` upgrade paths) · Genshin Fandom (Artifact EXP,
Weapon EXP, Refinement) · HoYoLAB announcements (4.3 batch overhaul) · Dexerto
(D4 S4 Salvage-All) · dotesports / Icy Veins (D4 favorite-protect, Armory
salvage).
