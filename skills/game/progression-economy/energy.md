# Energy — the timestamp-regen currency

**Energy is a currency with temporal auto-grant.** The datamined model (Genshin
resin, materialized in Grasscutter's ResinManager) is the reference. All numbers
are **starting points**.

## The data model

```
Energy {
  current
  cap
  regenIntervalSec
  nextAddTimestamp   // server-stored, sent to the client
}
```

Recompute **lazily on every read/spend** from the **server clock in UTC epoch** —
never a tick loop:

```
energy = min(cap, stored + floor((now − last) / regenIntervalSec))
```

- The regen timer only runs **below cap** (no waste accrual above cap).
- The client renders a **prediction only**; the server is authoritative.
- Offline regen is free by construction — it's arithmetic, not a loop.

## Parameters (Genshin, corrected)

- Cap 120 (1.0) → 160 (1.1) → **200 (4.7)**; 1 per 8 min = 180/day; 0→200 =
  26 h 40 (the overnight-safe rationale — a full overnight stays under cap so no
  regen is wasted).
- Costs: domains/ley lines 20, normal bosses 40, weekly bosses 30 for the first 3
  then 60 (since 1.5 — no 5.x cost reductions exist).
- Primo refills use escalating prices (50→200, 6/day) — friction as data.

## The consumable taxonomy

Energy items come in three persistence classes — choose deliberately:

- **Condensed** (banked energy, cap 5, doubles a run's reward) — stored,
  non-expiring, transforms one run.
- **Fragile** (+60, never expires) — a permanent stored top-up.
- **Transient** (+60, per-instance TTL, since 1.5) — each batch expires 7 days
  after the following Monday (an item-currency with a per-instance TTL).

## Why energy exists (one design line)

Energy smooths sessions (caps per-day burst) and server load (spreads activity);
everything else here is the data model. The design tension is between respecting
player time (overnight-safe cap) and creating a monetization/retention hook
(refills) — tune the cap-to-cost ratio for your session-length target.

## Clock discipline (the failure class)

- **Server timestamps only**, UTC epoch — never the device clock (advancing the
  phone clock must not grant energy).
- DST transitions are the recurring bug class: Lost Ark (March 2022, botched DST
  rollout shifted events) and MapleStory (November 2023, vouchers lost at a
  shifted reset) are real incidents. Same class as `world-time-weather`'s 4 AM
  reset bugs — test the regen and any daily-reset math across a DST boundary both
  ways (pitfalls #5).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Cap | 120 → 160 (1.1) → 200 (4.7) | wiki |
| Regen | 1 / 8 min = 180/day; 0→200 = 26h40 | wiki |
| Costs | domains/ley 20, bosses 40, weekly 30→60 | wiki |
| Condensed | cap 5, doubles a run | wiki |
| Transient | +60, per-instance 7-day TTL (since 1.5) | wiki |

## Flagged gaps — do NOT invent

The exact 5.x cost table beyond the documented values · refill price ceilings ·
the internal storage of consumable TTLs.

## Sources

Grasscutter (ResinManager, `nextAddTimestamp` protocol) · Genshin Fandom
(Original/Condensed/Transient Resin) · Lost Ark / MapleStory DST incident
coverage.
