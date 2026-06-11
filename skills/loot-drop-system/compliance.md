# Compliance — disclosure, gambling law, anti-cheat

The regulatory, disclosure, and anti-exploit constraints an architect must
design *for* when random loot is monetized. Distinguishes **hard law** (binding)
from **platform policy** (store contract) from **best practice** (voluntary).
Reference date: 2026. **This is not legal advice — verify the current statute
for your markets before shipping.**

## Drop-rate disclosure — who requires what

### Hard law

- **South Korea — Game Industry Promotion Act amendment** (in force 2024-03-22):
  **mandatory** disclosure of probabilistic item types and the probability per
  type — **in-game, on the website, and in ads/promo**, "easily identifiable",
  displayed **as a percentage**, with advance notice of changes. Covers nested
  mechanics (a draw affecting another draw) and **pity** (100% guaranteed after N).
  Fully-free items are excluded. Penalties up to ~20M KRW or 2 years. **The
  strictest hard disclosure law in the world today.**
- **China — Ministry of Culture Notice** (in force 2017-05-01) required publishing
  item names, contents, quantities, **and probabilities**, with draw results kept
  ≥90 days. **Uncertainty**: this Notice was **repealed in 2019**; no specific
  national disclosure law is active now (industry keeps publishing out of
  caution). The 2023 Draft Measures did **not** restore odds-disclosure.

### Platform policy (contractual, not law)

- **Apple App Store** Guideline **3.1.1** (added Dec 2017): apps with paid
  randomized items **must disclose the odds of each item type before purchase**.
- **Google Play** policy (May 2019): disclose odds "in advance of, and in close
  and timely proximity to" the purchase.

### Rating labels (presence descriptors, NOT odds disclosure)

- **ESRB / PEGI "In-Game Purchases (Includes Random Items)"** (2020-04-13):
  applied to any game with randomized paid items. These **signal presence**; they
  do **not** disclose odds.

## Loot box as gambling — by jurisdiction

The triad that triggers gambling classification: **(1) paid stake + (2) random
outcome + (3) a prize with real-world value**.

- **Belgium** (2018): paid loot boxes **violate** gambling law (no cash-out
  needed). The **only country** to treat them as gambling outright; majors
  disabled purchases there.
- **Netherlands** (2018): 4 of 10 studied boxes ruled illegal on the
  transferable/tradeable criterion — but **reversed** by the Council of State
  (March 2022).
- **UK**: not gambling while rewards are closed-loop (non cash-out); 2022
  government response = no new law, industry guidance (Ukie, July 2023: parental
  controls, default spend limits, odds disclosure).
- **Australia**: not "gambling" but **mandatory classification** since 2024-09-22
  — paid loot boxes → **M** minimum; simulated gambling → **R18+**.
- **USA**: no federal law; status unsettled. *NY AG v. Valve* (2026) alleges
  CS2/TF2/Dota 2 loot mechanics = illegal gambling (parallel class action in WA).
- **Japan**: "Compu Gacha" banned (2012); simple gacha tolerated with voluntary
  guidelines.

## Required design affordances

- **Publish odds** per item/type, as a percentage, **in-game AND online** (Korea:
  also in ads), before the purchase and in proximity (Google).
- **Disclose pity/mercy** (guaranteed after N) — explicit Korean requirement.
- **Separate real-money vs earned currency**: purely free/earned items often
  escape regulation; the gambling/classification trigger is the link to
  **real-world currency** (direct or via purchasable virtual currency).
- **Age gates / spending limits** (UK guidance, Australia M/R18+).
- **No direct legal-tender purchase of draws** (historical Chinese rule).
- **Regional gating**: disable paid loot boxes in Belgium; classify M/R18+ in
  Australia.

## Server-authoritative anti-cheat for drops

**Non-negotiable: the server is the only source of truth. The client *requests*,
the server *decides* and replicates state.**

- **Rolls run server-side.** A client saying "I have 3 potions" is ignored; it
  says "I attempt to open/consume", the server decides.
- **Seed / replay protection**: for client sims (PoE-style), issue a **secret
  per-run seed** from the server and **recompute** the result deterministically —
  any forged roll outside the seed is detected. Secret seed = unpredictability
  (anti-precompute); a public seed demands server recompute (never trust the
  reported loot).
- **Save-scum prevention**: server-side persistent state — manipulating a local
  save is inert; drops must never be re-rollable by a client reload.
- **Dupe prevention** (concurrency + client trust): session-locked persistence,
  server-side validation of each mutation (the exact slot, not just ownership),
  atomic two-profile locking for trades, idempotency keys cross-server, and
  **atomic saves** on critical transactions (crash dupes come from non-atomic
  player-vs-container saves). See `inventory-equipment` networking for the full
  treatment.
- **Audit logging of grants**: log who/what/seed/timestamp/source; retain ≥90
  days (aligns with the old Chinese rule and proves your displayed odds).
- **Detect impossible loot**: reconstruct state authoritatively on instance exit;
  an item outside the table/odds = reject + flag.

## The drop-rate-lie scandal (the cautionary tale)

**Nexon / MapleStory** (Korea KFTC, Jan 2024): an **11.6B KRW (~$8.9M)** fine —
the largest consumer-protection penalty in Korean history — for **secretly
manipulating** the drop rates of "Cubes" since 2010 (lowering popular items'
odds, sometimes to zero) and then **publicly denying** any change. The single
most important architectural invariant follows directly: **the odds you display
must be the exact odds your server RNG uses — one shared source, never two.**

## Compliance & anti-exploit checklist

```
Disclosure / compliance
- [ ] Odds per item/type stored as data, shown in-game + online, as %,
      before purchase and in proximity (Apple/Google/Korea)
- [ ] Displayed odds == odds the server RNG actually uses (one source) —
      anti "drop-rate lie"
- [ ] Pity/mercy guarantee disclosed (counter N → 100%)
- [ ] Nested mechanics (a draw affecting another) disclosed (Korea)
- [ ] Earned vs paid/real-money currency clearly separated
- [ ] Rating label applied (ESRB/PEGI "Includes Random Items") if paid random
- [ ] Regional gating: disable paid loot boxes in Belgium; M/R18+ Australia;
      age gates / spend limits (UK)
- [ ] No uncontrolled cash-out secondary market (gambling risk)

Anti-exploit / security
- [ ] Drop roll 100% server-side; client never authoritative on the item
- [ ] Secret server-issued seed + deterministic recompute for client sims
- [ ] Session lock on the profile; mutations validate the exact slot;
      atomic two-profile trades; idempotency keys cross-server
- [ ] Atomic saves on grant/trade (avoid crash/disconnect dupes)
- [ ] Immutable audit log of every grant (actor, item, odds, seed, time);
      retain >= 90 days
- [ ] Impossible-loot detection (outside table/odds) -> reject + alert
```

## Flagged uncertainty — verify before citing

China's disclosure rule was repealed in 2019 (now de-facto best practice, not
hard law) · the Netherlands ruling was reversed in 2022 · the US has no federal
law and *NY AG v. Valve* (2026) is unresolved · Belgium is a global outlier ·
exact statutes and dates come from secondary sources — **verify the current law
for each target market.**

## Sources

China MoC Notice (2016/2017) + repeal analysis (Pillar Legal, Mondaq) · Korea
Game Industry Promotion Act amendment (Digital Policy Alert, KLRI) · Apple
Guideline 3.1.1 (Fenwick, The Verge) · Google Play policy (Google Play Console
Help) · ESRB/PEGI "Includes Random Items" (ESRB blog, Perkins Coie) · Belgium
(BBC, Lexology) · Netherlands + 2022 reversal (Mondaq) · UK (Gambling Commission,
GOV.UK Ukie guidance) · Australia classification (classification.gov.au) · Nexon
KFTC 2024 fine · NY AG v. Valve (ag.ny.gov, 2026) · server-authoritative / seed /
dupe patterns (PoE forums, ProfileService, Minecraft MC-63).
