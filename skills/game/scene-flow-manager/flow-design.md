# Flow design — FTUE, title/attract, live-service, loading & error UX

The player-facing side of the flow: how fast you get to fun, what the
title/menu is for, the live-service session loop, the UX of waiting, and
how disconnects/errors feel. The flow *engineering* is in
[fsm-composition.md](./fsm-composition.md); the loading *tech* in
[loading-lifecycle.md](./loading-lifecycle.md). `[P]` praised, `[C]`
criticized, `[?]` uncertain/vendor-sourced.

## FTUE & onboarding

- **"Time to Fun" (TTF)**: how fast a player goes from launch to doing
  something enjoyable — top mobile games target **<60 s**. Longer TTF =
  churn. Principle: deliver value fast, unpack complexity slowly. `[?]`
  benchmarks are vendor figures.
- **Defer friction**: delay account creation, character creators,
  customization, and difficulty choice until *after* the core loop is
  felt. `[C]` the counter-example: a dense options screen + 15 minutes
  before the player touches the promised fantasy deflates excitement.
- **Doing > Showing > Telling**: interactive tutorials beat graphics beat
  text — one mechanic / one button at a time via contextual overlays.
- **Cold-open / diegetic tutorial** `[P]`: teach inside gameplay, no
  pop-ups. Half-Life 2's "invisible tutorial" introduces each enemy/
  mechanic in a *safe* context first; God of War teaches the first axe
  swing diegetically (chopping a tree). The opposite `[C]`: Skyrim's
  unskippable intro forces veterans to re-learn every new save.
- **The new-player-in-a-veteran-game problem** `[C]`: Destiny 2 "New Light"
  drops new players into current-season content with no narrative context
  and ~20 menu screens — Bungie itself admits the funnel is broken. A
  live-service game must keep a **curated new-player path** as content
  accretes.
- **Day-1 retention caps everything**: D1 mathematically bounds all
  downstream retention; track a **tutorial funnel** (per-step events) and
  A/B-test removing single steps. ~20% of players don't finish the first
  quest. `[?]` benchmark numbers are directional.
- **Skip FTUE for returning players** — don't re-force a tutorial; offer it
  as a returnable submenu. The flow parameterizes the first-boot vs
  warm-boot branch ([fsm-composition.md](./fsm-composition.md)).

## Title screen / main menu / attract flow

- **"Press Start" exists for several reasons**: arcade coin-op heritage;
  **attract mode** (an idle-timeout demo loop as a sales pitch + burn-in
  guard); **controller binding** (the press identifies the primary
  controller); a **user-agnostic landing** (no user data loaded — sign-out
  returns here while loading happens behind it); and historically a cert
  requirement. This is exactly the boot/Title context's job in the FSM.
- **The main menu as a reactive "place"** `[P]`: the menu reflects progress/
  story state (Mario Kart darkening once everything's unlocked, Spider-Man
  2 changing by chapter, Stellar Blade's post-completion outfit, a VN sky
  shifting blue→orange for the final act). Implementation: **persistent/
  global flags** the menu context reads on entry.
- **Pre-menu legal/logo fatigue** `[C]`: stacked publisher/engine/legal/
  anti-cheat splashes + the mandatory autosave warning add bureaucracy to
  what should be a fun moment (Jonathan Blow's cert critique). Mask early
  init behind them, keep them skippable when not contractual.

## Live-service session & lobby flow

- **"5 popups before you can play"** `[C]`: daily-login rewards + "what's
  new" + battle-pass + store interstitials gating the play button
  (Battlefield 6's review drop, Sea of Thieves' "closer to 20 than 10"
  clicks to set sail). Keep the path to gameplay short; make interstitials
  dismissible/disableable.
- **The FOMO treadmill** `[C]`: battle passes that reset, limited-time
  events, and expiring currencies make play "feel like a job" — a flow/
  retention tension to weigh, not a default.
- **The hub as the between-mission context**: a social hub/lobby (Destiny's
  Tower) as connective tissue — a real FSM context with its own scene set.
- **Boot-straight-to-lobby**: modern live-service boots toward the
  multiplayer lobby rather than a static menu — in tension with the
  legal/logo gauntlet above.

## The UX of loading & waiting

- **Progress-bar psychology**: indicators make people willing to wait ~3×
  longer with higher satisfaction (NN/g). The **end anchors** time
  perception — a bar that races then **stalls near 100% is the worst**
  (destroys trust); prefer constant or slow-to-fast for short loads. This
  is the "honest, monotonic, reserved-tail" progress rule in
  [fsm-composition.md](./fsm-composition.md), with the *why*.
- **The labor illusion (ethics)**: signaling real effort can make people
  *prefer* a slightly longer wait and trust the result (instant can read as
  "canned/fake") — but a **fake bar not tied to real process** breaks trust
  if it loops/sticks. Model the system to *feel* honest, never to deceive.
- **Hiding loads / seamless masks** `[P]`: elevators, vent crawls,
  slow-opening doors, and scripted climbs mask streaming while keeping the
  player **in control** (preserves flow; critical in VR to avoid the black
  void). Mass Effect elevators (`[C]` initially clunky, later smoothed),
  Soulsborne elevators, Uncharted climbs. SSDs are making many "airlock"
  transitions obsolete.
- **Playable loading screens**: the Namco patent (US 5,718,632, filed 1995)
  chilled the feature for ~20 years until it **expired Nov 2015**; others
  used snippets of the main game as a loophole. Now usable freely.
- **Loading as branding/storytelling**: lore snippets, tips, and art
  deepen the world (Bloodborne lore); "load while you watch a cutscene" is
  the cinematic mask (`cinematic-system`).

## Interruption, resume & save-state UX

- **"Come back exactly where you were"** is the modern bar: Xbox **Quick
  Resume** `[P]` snapshots RAM to SSD (resume mid-session even after
  power-off); PS5 has no equivalent and cold-boots. The engineering side
  (suspend budgets, auto-save-on-suspend) is in
  [loading-lifecycle.md](./loading-lifecycle.md).
- **Saving is a player right, not an earned privilege**: let players stop
  **any time** and resume with ~zero replay. The **suspend-save / save
  marker** pattern (Fire Emblem, Sirlin) creates a one-shot resume point on
  quit that's destroyed on load — letting you stop mid-boss without
  reducing difficulty. Old checkpoint-only systems were partly a
  memory-card write-speed workaround.
- **The "DO NOT TURN OFF" warning** `[C]` exists only because a naive
  single-file overwrite can corrupt on power loss — **robust save** (write
  beside old, flush, verify, then swap; keep 2 copies — see
  `save-persistence`) makes the warning unnecessary.
- **Autosave feedback best practice**: a subtle icon/toast ("Saving…" →
  "Saved"), not a modal; **conditional** "you'll lose progress" prompts
  (suppress if a save just happened); **independent** autosaves so a player
  isn't saved into an unwinnable state.

## Error & disconnect UX

- **Plain language > codes**: a good error = **what happened + why + the
  next action**; avoid stack traces / raw codes / "Something went wrong."
  Codes go *after* the plain explanation (for support). The Genshin "Error
  4206" model `[?]`: the code identifies it for support but the UX is
  generic — best practice pairs the code with an actionable sentence ("We
  couldn't connect to the server. Check your connection… (Error 4206)").
  This is the per-step error-code contract in
  [fsm-composition.md](./fsm-composition.md), done well.
- **Disconnect / reconnect**: distinguish **involuntary DC** (a reconnect
  grace window — Overwatch's ~2 min) from **intentional leaving** (an
  escalating penalty — Rocket League's 5→10→20→…min ban). The `[C]` failure
  is "penalized for a 40 s DC with no path back."
- **Queue UX** `[C]` launch-day disasters: FFXIV Endwalker's record logins
  (Error 2002 when a data-center queue exceeds 17,000). Rules: a **real
  queue with a position indicator** is crucial (vs rejecting connections,
  which makes players mash reconnect and DDoS your own login server); the
  queue is cheap to hold on isolated hardware; canceling sends you to the
  back; the lobby holds your place ~1 min on a blip. Long queues need
  **place-in-line + estimated wait**. This is the Queue context in the FSM.
- **Maintenance comms**: proactive pre-launch advisories (the FFXIV model)
  set expectations *before* the wait — the praised pattern.

## Cross-cutting principles

- **Reduce time-to-control, defer friction, teach by doing** — FTUE,
  loading, and hubs all converge here.
- **Honesty in feedback** — progress, queues, and errors should be real and
  actionable; deception erodes the trust that makes waiting tolerable.
- **Respect the player's time as a right** — saving, resuming, and
  rejoining should minimize lost progress; the modern bar is "exactly where
  I left off."
- **The pendulum**: cold-open immersion (HL2/GoW) vs the menu-first
  live-service monetization gauntlet (BF6/SoT) is today's central
  player-facing flow tension.

## Sources

Etch / Jon Lai "Time to Fun" · "Half-Life 2's Invisible Tutorial" · GoW
level-design teardowns · UX Planet onboarding · GamesRadar/GameSpot/PCGamesN
(Destiny 2 New Light) · gamedev/ux.stackexchange (Press Start) · Fuwanovel
(reactive title screens) · Jonathan Blow / The Witness cert blog · All Out
Gaming / Sea of Thieves forums (live-service popups) · Gamerant (FOMO) ·
Google Patents US5718632A + EFF + Polygon (playable loading) · NN/g
(progress indicators, error messages, virtual queues) · Wang/Kang/Rau
(progress-bar perception) · 4ourth Mobile (labor illusion) · Wayline / ISPR
(hidden loads) · Xbox Support (Quick Resume) · Sirlin "Save Game Systems" ·
Steve Bromley "How to save games" · Blizzard OW / Epic RL (leaver rules) ·
FFXIV Lodestone (Endwalker congestion). Flags: D1/D7 + tutorial benchmarks
are vendor figures; the Genshin 4206 wording is synthesized; always-online
and post-match-loop specifics are under-sourced.
