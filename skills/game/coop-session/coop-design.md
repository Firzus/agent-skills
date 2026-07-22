# Co-op design — philosophy, split-screen, UX, encounter design

The design craft and player-facing UX of co-op — orthogonal to the
netcode. The Genshin drop-in model is one design pole; the Hazelight
"designed entirely around two players" model is the opposite pole. Know
both. `[DOC]` = dev talk/commentary, `[?]` = uncertain/lightly sourced.

## Design philosophy & taxonomy

- **Cooperative vs competitive**: co-op aligns win conditions (shared
  fail/success); competitive opposes them. Valve built L4D to fill "a
  perceived gap… we wish there were more cooperative games" (Booth, GDC
  2009).
- **Design pillars: interdependence > shared goals > complementary
  roles.** The strongest co-op makes neither player self-sufficient.
  Hazelight: find the mechanic that makes both players feel they're
  collaborating; mechanics must "communicate with each other" — "not a
  co-op shooter where you can shoot alone" (Josef Fares). `[DOC]`
- **Co-op-first vs co-op-bolted-on**: "When you design a single-player
  game and then add co-op, you have to adapt it." The two poles:
  - **Designed-around-two (Hazelight)** — A Way Out, It Takes Two, Split
    Fiction: co-op *only*, persistent split-screen even online, one
    purchase plays two. The design antithesis of drop-in — use it as the
    **contrast pole**, not the template for a Genshin-style session.
  - **Drop-in/drop-out (Genshin, this skill)** — content tolerates a
    player joining/leaving anytime; separate progression so a veteran and
    a newcomer can play across a level gap.
- **Asymmetric co-op**: players hold different abilities/info and must
  bridge the gap — Keep Talking and Nobody Explodes (defuser sees the
  bomb but no manual; experts hold the manual but can't see the bomb), so
  **communication is the mechanic**, not a side-channel. `[DOC]`
- **Forced-interdependence puzzle design (Portal 2)**: every chamber must
  *require* both players — "as soon as a playtester finished a puzzle with
  one set of portals, the level was sent back to designers." `[DOC]`
- **Shared vs separate progression**: Diablo III auto-parties everyone
  (no party management); Destiny gives **private loot streams** so a
  veteran replaying old content "still gets something great." Shared
  progress binds the group; separate progress enables drop-in across
  skill/level gaps (the drop-in-relevant choice).

## The AI Director (co-op pacing)

L4D's Director "adjusts pacing, not difficulty": it estimates each
Survivor's emotional **Intensity** (damage taken, incaps, proximity),
tracks the **max** across all four, and cycles **Build Up → Sustain Peak
→ Peak Fade → Relax** — removing threats when intensity is too high,
repopulating when too low. "Amplitude (difficulty) is not changed,
frequency (pacing) is" (Booth, AIIDE 2009) `[DOC]`. The most-cited co-op
pacing system, and the generalization behind performance-based encounter
scaling below.

## Split-screen / local co-op engineering

- **The fundamental cost: render the scene N×.** Rasterization assumes one
  camera projection; split-screen does "almost the entire work of
  rendering a frame again, once per perspective" — doubling/quadrupling
  culling, shadows, particles. `[DOC]`
- **Why split-screen declined**: each viewport is a full render pass;
  faster hardware gets spent on solo fidelity instead; studios bet on
  online-only (Halo Infinite cancelled its promised split-screen co-op).
  `[?]` player-criticized.
- **Aspect/feedback degradation**: a horizontal/vertical split changes
  each player's FOV/aspect (encounters tuned for solo FOV can break);
  4-way shrinks the view; positional audio collapses ("which screen did
  that yell come from?"). Per-viewport HUD must shrink and re-anchor
  (see `hud-system`).
- **Local input / hot-join**: multiple controllers need slot assignment
  and mid-session join (L4D: a second player joins by signing in a
  controller). Exact engine APIs (UE per-player input, Unity
  `PlayerInputManager` join-on-button) are `[?]` here.

## Shared-screen camera (cross-ref camera-system)

One camera, N players — the multi-target rig already in
`camera-system/math-tech.md`; cross-reference rather than re-derive:

- Compute the AABB enclosing all players (`min/max` of X/Y), grow by
  padding so no one touches the edge.
- Fit zoom on both axes → take the min: `zoom = min(viewW/worldW,
  viewH/worldH)`; lerp **both** position (→ box center) and zoom (→ fit),
  clamped to min/max. `[DOC]` (4 corroborating sources — high confidence)
- **The tether/leash**: shared screen physically tethers players; max
  separation = zoom-out limit. Beyond it, hard-stop at the frame edge or
  split. This is the "what if they go opposite directions" tension.
- **Dynamic split — "merge when close, split when far" (Lego/TT Games)**:
  shared view when close; screen splits along a dynamic diagonal by
  relative position; merges seamlessly on reunion. `[?]`/`[C]` the pivot
  line "swings dramatically" at mid-distance (nauseating) — some Lego
  titles reverted to a static split. Needs over-render past each slice
  edge, recombine hysteresis, and a fade on merge.

## Co-op-specific UX

- **Ping systems — the gold standard (Apex)**: context-sensitive
  single-button comms (ping ground = "go here"; ping item = names it;
  double-tap enemy = threat), teammates **acknowledge by pinging back**
  (closes the loop), a hold-wheel for more. Respawn **playtested for a
  month with mics muted and randomized names** to force reliance on pings
  — an accessibility milestone (removes the mic barrier) and the model
  for a **stranger-friendly pingless co-op session**. `[DOC]`
- **Portal 2 ping (the precursor)**: a **look ping** (focus attention) +
  a **countdown ping** (synchronize actions across lag — both see "GO" at
  the same instant). So important it's the first thing taught (co-op bots
  start immobilized, only able to ping). `[DOC]`
- **Loot distribution — three models**:
  - **Personal/instanced** (Diablo III, Destiny): each player sees only
    their own drops — "ninja looting a thing of the past"; group play
    raises spawn count so each gets a roll (more loot, not better). Anti-
    grief. `[DOC]`
  - **Shared/FFA** (Borderlands 1–2): intentional "every-player-for-
    themselves" anarchy. `[C]` punishes slow/lower-skill looters.
  - **Round-robin / hybrid** (Borderlands 3): instanced + per-player
    level-scaled drops by default, shared "Classic mode" optional — the
    most drop-in-friendly model for mismatched levels.
- **Downed / revive ("downed but not out")**: incapacitated ≠ dead — a
  vulnerable, immobile grace state forcing teammates to choose objective
  vs rescue (L4D: third incap without healing = death; teammate outlines
  through walls). `[DOC]` `[C]` failure mode: "your friend runs off and
  dies, annoying to cross the map" — mitigate with remote/teleport
  revive, channel-time risk, or a per-un-revived-teammate debuff.
- **Player identification**: nameplates, **player colors**, and
  **silhouettes/outlines through walls** keep the team legible in chaos
  (maps onto `hud-system` world-space nameplates).
- **Friendly fire on/off**: L4D ships FF *on* deliberately ("the need for
  caution and coordination") — a tension/realism vs grief-surface
  trade-off (off for strangers, on for friends/hardcore).

## Co-op content & encounter design

- **Scaling for N players — beware headcount multipliers**: static
  per-player HP/count multipliers cause **difficulty breakpoints** (one
  join/leave = a dramatic jump) and ignore team skill. Prefer
  **performance-based scaling** — measure actual clear rate and adjust
  spawn rate to hold pressure constant; observed **sublinear** scaling
  (double the team → ~+30% spawns). The L4D Director generalized. `[?]`
  (single indie source — DESS)
- **Co-op puzzles / gating**: two-button-door, boost/lift, one-
  manipulates-so-other-crosses; **co-op-gating** = content unsolvable
  solo (the Portal 2 rule).
- **Splitting up vs staying together**: shared objectives pull players
  together (revive proximity, shared screen); parallel objectives (hold a
  button while the other crosses) deliberately split them — the encounter
  design modulates which is rewarded.
- **Revive economy**: finite revives, bleed-out timers, third-strike
  death, or respawn-activation items carried to a beacon (Apex banner/
  beacon lineage) — tunes the cost of group failure.

## Accessibility & social

- **Skill-disparity / the "carry" problem — per-player assist**:
  Borderlands 3 scales enemies *per player* (each sees enemies at their
  level) and balances damage "so even the lowest-level character can
  contribute." Scale assist/difficulty **per player, not per session** —
  the cleanest answer to mismatched-skill drop-in. `[DOC]`
- **Drop-in structural design — rooms over matches**: a **room-based**
  model (persistent playspace, join/leave-in-progress, fixed slots)
  "dramatically reduces matchmaking load… shortly after one person
  leaves, another joins" vs a match-based full-roster wait. The hard part
  isn't the join plumbing — it's maintaining challenge, value-of-effort,
  and team balance as counts change; late joiners need **empowerment
  without invalidating** existing players' effort (Daniel Cook; gdp3
  drop-in/drop-out pattern). `[DOC]`
- **Cross-play friction**: input disparity (mouse vs aim-assist) is a
  **PvP** problem — in PvE co-op cross-play is mostly upside (bigger
  pool, shorter waits). Mitigate PvP with input-based matchmaking and
  cross-play toggles. Party-chat fragmentation across platforms remains
  a real co-op pain. `[?]`
- **Toxicity/griefing**: lean on **structure** (personal loot removes
  loot-theft grief; FF-off removes team-kill grief) plus vote-kick/report
  — "we remove the possibility" (Diablo III). Structural prevention beats
  moderation (the content-matrix anti-grief in
  [session-authority.md](./session-authority.md)).
- **Strangers vs friends**: different defaults — strangers get pingless
  comms, FF off, personal loot, vote-kick; friends can take voice, FF on,
  shared loot. The comms system must work **without voice** for the
  stranger path (Apex's muted-mic playtest is the proof).

## Sources

Booth "The AI Systems of Left 4 Dead" (AIIDE 2009) + "Replayable
Cooperative Game Design" (GDC 2009) · Portal 2 developer commentary +
Game Developer "Synthesizing Portal 2" · Josef Fares/Hazelight interviews
(The Ringer, The Verge, BAFTA) · Respawn/Apex muted-mic playtest (Game
Developer, GamesRadar) · Keep Talking and Nobody Explodes (Voices of VR
#98) · Diablo III blog (Jay Wilson), GameRant (Destiny), IGN SEA
(Borderlands 2), PlayStation Lifestyle (Borderlands 3) · PH3 Blog +
Game Developer "Shared-Multi-Split Screen Design" (split-screen cost) ·
ScreenRant/Lego (dynamic split) · AristurtleDev / KidsCanCode / Game
Developer "Single Camera for Four Players" (framing math) · L4D & Gears
wikis (revive) · Daniel Cook "What I've learned about designing
multiplayer games" + gdp3 drop-in/drop-out pattern · GWL/HowToGeek
(cross-play). Flags: performance-based scaling and "more players improved
win rate" are single-source (DESS); per-game lobby flows, cross-platform
voice, and parental safety are lightly sourced.
