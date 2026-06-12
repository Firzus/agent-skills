# Wallet & economy — ledger, faucets/sinks, inflation

The currency layer and the live-ops economist's craft. All numbers are
**starting points**; many are era-specific snapshots — use as ratios, not
current figures. Tagged **[DOC]** / **[C]**.

## The wallet is a ledger

- **Taxonomy + one-way conversion graph**: paid premium (platform-locked) →
  earned premium (cross-platform) at 1:1, irreversible; earned premium → sinks;
  soft currency and materials never convert upward. **The one-way edge IS the
  paid/earned split** — motivated by revenue recognition / reconciliation
  (GAAP/IFRS: revenue recognized on consumption), not a universal legal mandate.
- **Server-side balances + an append-only transaction journal.** Refunds compute
  **from the journal** (price paid), never from the current catalog; one rounding
  policy, documented; refund in the original currency only.
- **Caps, overflow, expiry as data**: native max-balance per currency; overflow →
  mailbox with explicit expiry, never silent loss; event currencies expire
  wholesale; per-instance TTLs exist (Transient Resin). Inventory caps by category
  are tuning data, not constants.

## Faucets & sinks — the core framework

The single most-misunderstood point in game economics:

- A **faucet** creates new currency from nothing (NPC → player); a **sink**
  destroys it (player → NPC/void). **Player-to-player trade is neither** — it
  only moves existing currency.
- **Destruction ≠ sink**: in EVE, blowing up a ship destroys *items*, not ISK
  (ships are bought from other players). Item-destruction is a *material* sink,
  distinct from a *currency* sink — conflating them is the classic error.
- **Why balance matters**: money supply grows with the player base. If faucets
  persistently exceed sinks, the currency inflates. The economist's job is to
  keep net flow near-zero or matched to real growth.

| Lever type | Examples |
| --- | --- |
| **Faucets** | mob bounties, quest/mission rewards, NPC vendor buy-back, insurance payouts, login bonuses |
| **Currency sinks** | repair/durability, AH/market fees & deposits, consumables, respec/reforge fees, fast-travel, training fees, taxes, luxury goods |
| **Material sinks** | full-loot PvP destruction, crafting-fail/enchant-loss, item-trashing (Albion Black Market) |

Real shipped balances: EVE's NPC-bounty faucet has historically dwarfed all
sinks combined (top-5 sinks ≈ 31% of the bounty faucet in one quarter →
structural inflation pressure). WoW leans on the **AH 5% cut** ("one of the most
effective gold sinks") + repair + the WoW Token. FFXIV deliberately keeps raw-gil
faucets tiny (quests "barely pay teleport fees") and uses housing + the 5%
market-board tax as sinks. PoE deliberately ships **almost no currency sinks** —
its orbs are *consumed on use* as crafting materials, so the currency is its own
built-in sink.

## Inflation & deflation

- **Why MMO economies inflate** **[DOC]**: faucets > sinks structurally;
  **mudflation** (each new tier makes old wealth trivial); gold farming / RMT
  (industrial currency injection); velocity of money (EVE models MV=PQ).
- **Real cases**:
  - **Diablo III RMAH** — textbook failure: money entered freely with no
    effective sink → hyperinflation, compounded by a 2013 gold-dupe bug (one
    player amassed ~371T gold). RMAH shut March 2014.
  - **RuneScape** — 2007 unbalanced-trade limits to kill RWT (reverted 2011 after
    a player referendum); Bonds (2013) added a 10% trade tax as a gold sink to
    undercut farmers.
  - **WoW Token** — a deflationary sink: buying game-time with gold removes that
    gold; soulbound on purchase, dynamic regional price, no AH cut.
- **Measuring it**: EVE's Monthly Economic Report publishes a Mineral Price Index,
  a 4,000+-item CPI (Laspeyres indices), and faucet/sink/destruction tracking.
  Community "Big Mac index" analogues peg a basket to a fixed reference good.

## The in-house economist

- **CCP / EVE — Dr. Eyjólfur Guðmundsson** (hired 2007): the first famous case of
  a studio hiring a PhD economist; authored the Quarterly/Monthly Economic
  Reports; framed CCP as the "Central Bank of EVE", tuning bounties/taxes to curb
  inflation.
- **Valve — Yanis Varoufakis** (2012): studied TF2/Steam as a live lab, found the
  economy "nowhere near" equilibrium (persistent arbitrage); key insight: digital
  economies give the economist *total data* — no sampling needed.
- **Square Enix / FFXIV — Yoshida** acts as de-facto economist: monitors gil and
  item prices, hotfixes drop rates up / recipe costs down to rebalance supply;
  treats housing & glamour as the primary high-value sinks.
- **Tooling**: published economic reports, internal per-currency earn-vs-spend
  dashboards by player segment, multi-session simulation.

## Player-driven markets

- **EVE** — full regional **order-book exchange** (limit orders, broker fees +
  sales tax as sinks). **WoW/FFXIV** — auction house / market board with a flat %
  cut. **Albion** — localized regional markets (transport risk → arbitrage) + a
  Black Market that converts player gear into PvE drops. **PoE/Diablo II** — pure
  barter; currency items emerge as de-facto money.
- **Manipulation & defenses**: broker/AH fees deter spam reselling; RuneScape's
  Grand Exchange caps daily price moves; **out-compete RMT** (Token/Bond/PLEX
  legitimize gold-for-time and starve farmers) rather than only banning.

## Currency design

- **Hard vs soft (the dual standard)**: soft (gold/Mora — earned in-play,
  high-volume, inflation-prone) vs hard (gems/primogems — bought or earned
  sparingly, the monetization lever).
- **Bound vs tradeable**: binding removes an item from the economy entirely (used
  to refocus on gameplay over market — D3 made crafted items account-bound); PoE
  takes the opposite stance (almost nothing bound, because tradeability gives
  items weight).
- **Multi-currency "economic lanes"**: mid-core games run 3–6 currencies, each
  with a distinct job (premium = flexibility, earned = progression, event tokens
  = participation). Letting every currency "do everything" collapses the economy.

## Wealth concentration

- **Measurable and extreme**: a DiGRA 2020 study found EVE's wealth Gini at
  **0.90 active / 0.97 all accounts** — more concentrated than real-world wealth;
  82.65% of wealth is in assets, not liquid currency. Wealth correlates with
  *time-in-game*, not first-mover advantage.
- **Luxury / status sinks** are the tool to drain top-end wealth without taxing
  the poor (WoW's multi-million-gold mounts, FFXIV housing & glamour). Watch the
  flip side: higher upkeep (repair costs) disproportionately hits low-wealth
  players — keep faucets accessible to casuals while luxury sinks bleed the rich.

## Cross-cutting principles

- Match net flow to *growth*, not to zero.
- Destruction sinks for material goods; fee sinks for currency.
- You can't fix bad itemization with the economy (the D3 cascade).
- Out-compete RMT, don't only ban it.
- Item integrity = economic integrity (items must be dupe-proof AND tradeable to
  hold worth — Wilson, GDC 2019).

## Flagged gaps — do NOT invent

EVE QEN figures are 2007–2010 snapshots (illustrative ratios, not current) · WoW
repair-cost and luxury-mount specifics come from third-party guides · the
"371T gold dupe" magnitude is journalistic · the Gini figures are one 2020 paper
· gacha currency-design points are industry-blog consensus, not first-party
postmortems.

## Sources

CCP EVE Quarterly/Monthly Economic Reports (Dr. Guðmundsson) · Engadget "EVE
Evolved: ISK sinks and faucets" · Blizzard "Introducing the WoW Token" ·
Centives / Polygon / pcgamesn (D3 RMAH) · Jagex/RuneScape (trade limits, Bonds) ·
Varoufakis VALVEconomics · Yoshida Q&A (FFXIV gil sinks) · Albion wiki (Black
Market) · Hooper DiGRA 2020 (Gini) · Chris Wilson GDC 2019 (item integrity) ·
gamedeveloper.com / FoxData (currency design).
