# Battle pass & season models

The season-progression layer across the industry. Numbers shift per season —
each is dated/versioned where given. Tagged **[DOC]** / **[~]** approximate /
**[!]** recently changed.

## Structure — free vs premium, tiers, currency earn-back

The genre's signature is the **net-positive premium-currency loop**: buy the
pass, earn enough premium currency to buy the next one. The reference case was
Fortnite's old 1,000 spent → 1,500 earnable (now collapsed to 800↔800 after a
2026 repricing). Where each game sits:

| Game | Pass cost | Earnable back | Net |
| --- | --- | --- | --- |
| CoD MW3 | 1,100 CP | up to 1,400 CP | **+300** |
| Fortnite (pre-2026) | 1,000 VB | up to 1,500 VB | **+500** [!] |
| Fortnite (now) | 800 VB | 800 VB | 0 [!] |
| Rocket League / Halo / OW2 | 1,000 | ~1,000 | 0 |
| **Valorant** | 1,000 VP | **0** | **−1,000** (pure cosmetic) |
| Destiny 2 | 1,000 Silver | Bright Dust only | n/a |

Tier counts range 50 (Halo) to 100+ (Fortnite, Destiny, CoD's ~100-token sector
map). Tier-skip purchases (~150 VB each) and premium "Ultimate" SKUs (+tier skips
+ bonus currency) are standard. Page-based / currency-gated variants (Helldivers
2 Warbonds with Medals, Marvel Rivals with Chrono Tokens) replace the XP ladder
with a tech-tree spend.

## Season models — expiry vs never-expires

- **Typical length**: 8–10 weeks (56–70 days; OW2 avg 63; Fortnite ~90).
- **FOMO-expiry (the default)**: Fortnite, Apex, OW2, Valorant, CoD, Rocket
  League. Unfinished tiers are gone at season end; Destiny gives a 2-season
  *claim* window for already-earned premium rewards.
- **Never-expires (the contrast)**:
  - **Halo Infinite** — all passes permanently purchasable, you own a $10 pass
    forever and progress one at a time ("when you put 10 bucks in, you keep that
    10 bucks"). Trade-off: no urgency → weaker daily-retention hook.
  - **Helldivers 2 (Warbonds)** — evergreen, never rotate out, progressed with
    Medals at your own pace. The consumer-friendly benchmark; trade-off is
    reduced spend velocity.
  - **Marvel Rivals** — hybrid: the Luxury Pass persists, but earned tokens reset
    each season (purchased surplus carries over).
- **The trade**: expiry maximizes engagement intensity + spend urgency but drives
  burnout; never-expires maximizes goodwill + lapsed-player re-entry but softens
  the weekly-login compulsion.

## XP & challenge systems

- **XP curve archetypes**: flat/linear (Fortnite: 80,000 XP/level, no scaling, L1→2
  == L199→200; L100 ≈ 8M, L200 = 16M), challenge-gated (Halo originally), or
  match-XP + boosts (OW2 +20% premium, Valorant +3%).
- **Cadence**: daily quests (~1 level/day), weekly quests (bonus every N), and
  seasonal/milestone challenges.
- **The weekly-cap pattern**: Fortnite soft-caps passive XP at ~50 levels/week
  (quests/accolades exempt) to throttle unlock speed and normalize leveling
  across modes — "no consistent XP cheese". Reuse the `quest-system` typed
  objective-event pattern for missions; the weekly cap covers daily+weekly only.
- **Catch-up**: double-XP weekends, premium XP boosts, post-bug compensation
  (OW2 enabled game-wide double XP to make up an XP bug).

## Reward design

- **Cosmetics-only is the norm** (no gameplay advantage); power-adjacent
  exceptions exist (Destiny seasonal artifact/weapons, Helldivers stratagems).
- **Currency rewards as retention glue**: premium currency drip-fed across tiers
  so the pass "pays for itself".
- **Drip-feed cadence**: rewards slightly front-loaded to hook; currency nodes
  spaced to pace completion. Rocket League shows 30 tiers ahead (deterministic).
- **Duplicate protection**: most level-pass rewards are unique-by-tier so dupes
  are structurally impossible (contrast with lootbox RNG).

## Entitlement & technical (the architecture)

- **Retroactive tier unlock on purchase** — universal: buy premium mid-season →
  instantly receive all premium-track items up to current progress, in **one
  transaction**. (Caveat: XP boosts are typically NOT retroactive.)
- **Cross-progression / cross-platform** — pass + progression travel via account
  linking (must enable before applying); entitlement tied to the account, not the
  platform.
- **Platform-siloed entitlement** is a real shipped constraint (CoD's PlayStation
  +5 tier skips; the Genshin 2.4 PlayStation-only BP claim case; mobile gifting
  restricted by IAP policy) — document platform rules in the track design.
- **Idempotent claim / rollover (the broken-claim incidents)**:
  - **OW2** — recurring server-side claim failures (missing Mythic prisms, coin
    rewards); Blizzard's response was "rewards will be awarded later" — i.e.
    claims **queued and reconciled**, not lost.
  - **Apex** — gifted items not appearing; client restart forces inventory
    re-sync (eventually-consistent delivery).
  - **The robust design**: server-authoritative, **idempotent grant keyed by
    (account, tier)** so a missed claim is recoverable and never double-applied;
    auto-grant earned-but-unclaimed rewards at rollover (the Fortnite policy).
- **Receipt validation** server-side with seen-before tracking (one receipt = one
  grant); gifting disputes resolve via platform order ID + timestamp.

## The data model (materialized by Grasscutter)

```
SeasonDef        { id, start, end }              // one UTC instant each
LevelRewardTable [level][track]
MissionDef       { type, objectiveEvent, target, bepReward, refreshType,
                   countsTowardWeeklyCap }
PlayerBPState    { seasonId, exp, level, trackEntitlement,
                   claimedRewards[], missionProgress[] }
```

The server's `triggerMission` increments progress; `takeReward` validates and
delivers server-side. Season end = **one UTC instant** displayed in local time
(pitfalls #10).

## Engagement evidence

The Dota 2 Battle Pass is the clearest revenue proof: 25% of pass revenue fed the
TI prize pool, which climbed to **$40.0M (TI10, 2021)** — an all-time esports
record — then **collapsed to ~$2.6M (TI13, 2024)** after Valve gutted the pass.
Direct, measurable evidence that reward-rich pass design drove the spend.

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Season length | 8–10 weeks typical (OW2 avg 63 days) | industry |
| Fortnite XP | 80,000/level flat; L100 ≈ 8M | fortnite.gg |
| Net-positive loop | CoD +300 CP; Fortnite was +500 VB, now 0 | press |
| Weekly cap | Fortnite ~50 levels/week (quests exempt) | GameSpot |
| Dota 2 TI prize | $40.0M (2021) → ~$2.6M (2024) | Liquipedia |

## Flagged gaps — do NOT invent

Per-season numbers drift — pin to a cited season/patch · Fortnite 2026 repricing
and Apex S22 restructure are recent/contested · Valorant total-XP and RL
credit-back tier are community estimates.

## Sources

fortnite.com / fortnite.gg (Fortnite XP, repricing) · Liquipedia (Dota 2 prize
pools) · helldivers.wiki.gg (Warbonds) · halowaypoint.com (Halo pass model) ·
ea.com (Apex S22) · help.bungie.net (Destiny rewards pass) · Blizzard news + forum
(OW2 season, claim bugs) · support.activision.com (CoD sectors) · Grasscutter
(BattlePassManager).
