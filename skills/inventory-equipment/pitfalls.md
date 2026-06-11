# Pitfalls — the 16 classic inventory/equipment failure modes

Each: symptom → root cause → prevention, with real incidents where
documented. Read before designing; re-read when a player feeds their
god roll or a set bonus applies twice. Deep dives:
[data-model.md](./data-model.md), [gear-generation.md](./gear-generation.md),
[enhancement.md](./enhancement.md), [inventory-ui.md](./inventory-ui.md),
[networking.md](./networking.md).

## 1. Instance identity loss

- **Symptom** — rolled stats/locks untrackable; equips and loadouts
  break after a load.
- **Root cause** — equipment treated as fungible counts; or instance
  IDs derived from volatile state (list indices, engine object IDs,
  pointers).
- **Prevention** — the stable-GUID rule: generated at creation,
  persisted in the save, the only key referenced by equips/loadouts.
  (PlayFab v2's per-instance StackId plays this role; Unity's
  `GetInstanceID()` is session-unstable — never.)

## 2. The duplication classic

- **Symptom** — items/currency duplicated via trade, swap, split, or
  disconnection.
- **Root cause** — a race between a client action and server
  validation; mutations outside a single path.
- **Prevention** — a single server-authoritative mutation path +
  atomic transactions (both profiles locked in a trade, both commit
  or both roll back) + idempotency keys (`progression-economy`).
  Real case: **Diablo IV 2023** — open trade, deposit items,
  force-close the client → items in both inventories; Blizzard
  disabled trading and threatened bans.

## 3. Fodder eats the god roll

- **Symptom** — the player consumes their best piece as enhancement
  fodder; rage and support tickets (editor policy is universally
  "no restoration").
- **Root cause** — no lock system; batch-select includes everything
  unequipped.
- **Prevention** — per-instance locks with the protection **in the
  model** (`isDestroyable = !locked && !equipped` — the Grasscutter
  invariant), locked-excluded-from-batch, explicit confirmation on
  high-value fodder. The shipped escalation: manual lock (1.1) →
  **auto-lock plans** (4.3: per-set criteria, lock at acquisition,
  retroactive scans) → Lock Assistance (5.2).

## 4. The 99.9%-trash flood

- **Symptom** — rolled gear is overwhelmingly trash; caps hit
  constantly; inventory cleaning becomes the gameplay.
- **Root cause** — the recycling loop is slower than the acquisition
  loop.
- **Prevention** — batch dissolve (cap ~100) with auto-add rules
  mirroring lock plans, and **recycle-into-value**: the strongbox
  pattern (3×5★ → 1×5★ of a chosen set) returns *acquisition* value,
  not just slots; salvage converts leveled trash into EXP books at
  100%. The recycle loop must match the drop loop's speed.

## 5. Sort instability

- **Symptom** — items with equal keys jump around on every
  open/refresh; pagination duplicates or skips entries.
- **Root cause** — unstable sorts or comparators without a total
  order; replicated list order isn't guaranteed anyway
  (FFastArraySerializer documents this).
- **Prevention** — stable sort + a **deterministic final tiebreaker =
  instance ID** (never a timestamp — bulk grants collide). The UI
  sort is the only order the player ever sees.

## 6. Stat recomputation drift

- **Symptom** — displayed stats ≠ actual; bonuses double-applied
  after re-equip.
- **Root cause** — missed or doubled equip/unequip events; additive
  non-idempotent application.
- **Prevention** — one recompute pipeline (full recalculation from
  active sources, not deltas); in GAS: equip = an infinite
  GameplayEffect whose removal is handle-guaranteed — never write
  attribute bases directly. Triggers: equip, unequip, piece
  level-up, set-count change.

## 7. Set-counting edge cases

- **Symptom** — 2pc+2pc miscounted; a set bonus active with pieces in
  the inventory; cross-character counting.
- **Root cause** — the counter iterates the wrong collection.
- **Prevention** — the invariant: `count(set) = pieces equipped on
  THIS character`, equipped-only. And **re-resolve effects on
  change**, not just the count — even Genshin has documented runtime
  nuances (some buffs persist briefly after unequip, others drop
  instantly).

## 8. Loadout fallback holes

- **Symptom** — a preset references an instance now equipped
  elsewhere or dissolved → silent partial apply.
- **Root cause** — pin-by-instance loadouts without a conflict
  resolution policy.
- **Prevention** — an explicit per-slot fallback (skip + warn / steal
  with confirmation / clone-warn) — or sidestep structurally with
  **clone-by-rule** (the Genshin 5.7 choice: the preset is a saved
  query resolved at apply time — churn-immune, but can't pin exact
  pieces; a documented player complaint). Choose and document the
  trade.

## 9. Cap-hit reward loss

- **Symptom** — rewards granted at a full inventory are lost, or the
  flow blocks (crafting refused, claims frozen).
- **Root cause** — no capacity check before the grant, no overflow
  channel.
- **Prevention** — cap-check-before-grant + overflow-to-mail
  (`progression-economy`). The shipped alternative: Genshin *blocks*
  domain entry and claims at the artifact cap and forces in-situ
  cleanup — loss-proof but UX-hostile; document both options.

## 10. Icon loading hitches

- **Symptom** — opening a 1,000-item grid loads 1,000 textures
  synchronously → a freeze.
- **Root cause** — hard references on icons in definitions; loading
  at bind time.
- **Prevention** — virtualized grids (only visible widgets exist) +
  soft-referenced icons + async loading + placeholders (UE:
  `TSoftObjectPtr` + StreamableManager or `UCommonLazyImage`; Unity:
  Addressables handles bound on callback).

## 11. The hidden server roundtrip

- **Symptom** — every sort/filter/tab switch hits the server; the UI
  feels sticky.
- **Root cause** — the UI queries the backend instead of a local
  mirror.
- **Prevention** — authoritative-but-cached: the client keeps a full
  inventory mirror (filled at login, updated by deltas/replication);
  sorts/filters/tabs are 100% local; only *mutations* go to the
  server, reconciled on response.

## 12. The lying enhancement preview

- **Symptom** — the UI predicts "+X" but the server rolls something
  else; the player suspects cheating.
- **Root cause** — displaying an average or a point value for
  unrolled RNG (random tiers, random line at the threshold).
- **Prevention** — never present unrolled RNG as a number: show
  ranges ("a random substat will gain 7.0–9.3") and exact values
  only for deterministic outcomes (EXP, resulting level — what
  Genshin shows). (Principle-derived — no public incident found.)

## 13. Equip races in activities

- **Symptom** — equipment changed mid-combat/instance → state
  desync, swap exploits.
- **Root cause** — equipment mutation ungated by activity state.
- **Prevention** — contextual equip locks on the **mutation path**
  (refuse with a message): the documented "Cannot equip during
  combat" error; loadout swaps unavailable in combat; artifact
  management locked during instanced challenges (medium confidence
  on the exact non-combat scope — flagged).

## 14. The schema migration trap

- **Symptom** — a patch adds a field to gear instances; old saves
  crash on load or silently lose data.
- **Root cause** — direct deserialization against the new schema.
- **Prevention** — the `save-persistence` contract: a schema version
  in every instance, chained pure migrations (v1→v2→v3) with
  defaults for new fields, atomic writes, golden-save libraries
  tested in CI per release.

## 15. Mass-salvage destroys keepers

- **Symptom** — a "Salvage All" / "Sell All" sweep destroys high-rarity
  or wanted items the player meant to keep.
- **Root cause** — the bulk-destroy scope includes everything not
  equipped; rarity is no longer an implicit guard. Real case:
  **Diablo IV S4** changed Salvage-All to destroy everything not
  equipped *or favorited*, including Legendaries — accidental loss
  followed.
- **Prevention** — favorite/lock blocks salvage AND sell at the **model
  level** (not a UI filter); scope bulk ops to the *active tab* (the
  "Sell All Junk sells only this tab" pattern); a confirm prompt on
  destroying max rarity. See [inventory-ui.md](./inventory-ui.md).

## 16. Networked persistence dupes / drift

- **Symptom** — items duplicate across a trade, crash, or shard hop; or
  the authoritative count drifts from what the player sees.
- **Root cause** — non-atomic two-party transfer; client trusted for
  item state; async save before reconciliation; an item existing
  authoritatively in two shards; integer overflow on a stack value
  (the **Diablo III 1.0.8** RMAH gold dupe).
- **Prevention** — the [networking.md](./networking.md) playbook: client
  sends intent, server owns state; trades as 2-phase commit + escrow +
  row locks + idempotency key + hash-chained log; persist via ACID over
  an append-only ledger (reverse with compensating events, never edits);
  single-shard or single-writer account stash; soulbound gating on the
  most valuable items; a reconciliation/dupescan job. Incident playbook:
  disable feature → isolate → audit logs → targeted bans → avoid full
  rollback.

## Debugging order

When the inventory misbehaves: (1) grep for engine-ID or index-based
item references (#1), (2) feed a locked item via every batch path
(#3), (3) equip-unequip-equip in a loop and diff stats (#6), (4)
open the grid with equal-key items twenty times (#5), (5) apply a
loadout after dissolving one referenced piece (#8), (6) grant at cap
through every reward path (#9), (7) profile the grid open with a
cold icon cache (#10), (8) load a previous-release save (#14).

## Ship checklist

```
- [ ] Stable GUIDs on every instance; zero volatile-ID references
- [ ] Single mutation path; trade/swap/split atomic and idempotent
- [ ] Lock invariant in the model; batch ops exclude locked/equipped;
      high-value fodder confirmed
- [ ] Recycle loop (dissolve + recycle-into-value) as fast as the
      drop loop
- [ ] Stable sorts with instance-ID tiebreakers everywhere
- [ ] One stat recompute pipeline; equip effects idempotent
      (equip-unequip loop tested)
- [ ] Set counting equipped-only per-character; effects re-resolved
      on change
- [ ] Loadout model chosen (pin vs rule) with its fallback policy
      documented
- [ ] Cap-check-before-grant + overflow channel on every reward path
- [ ] Grids virtualized; icons async; cold-open profiled
- [ ] Sorts/filters fully client-side on the mirror
- [ ] Previews show ranges for unrolled RNG
- [ ] Equip mutations gated by activity context
- [ ] Instance schema versioned; golden saves migrate in CI
- [ ] Mass-salvage gated by favorite/lock; bulk ops scoped to active tab
- [ ] Online: trades 2-phase + escrow + idempotent; ledger + reconcile;
      soulbound on top-value items
```
