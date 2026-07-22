# Emergent — radiant, Nemesis, directors, simulation

Quest generation that isn't fully authored. Complementary to the authored model
in [data-model.md](./data-model.md). The structuring axis is **"story generator"**
(the player interprets a simulation log — Dwarf Fortress) vs **"quest list"** (a
template filled procedurally — Skyrim). Tagged **[DOC]** documented architecture /
**[OBS]** player-observed behavior.

## Radiant / template quests (Skyrim, Fallout 4)

The core mechanism is the **alias system** [DOC, CK docs]: a radiant quest is a
parametrized **template** — the quest logic is fixed, but the *roles* (giver,
target, location, item, reward) are **aliases** filled at runtime.

- An alias is a Reference (actor/item) or a Location, filled by: a fixed value; a
  **conditioned random pick** from world refs/locations; **creation** from a
  leveled list; or **borrowing** another quest's alias.
- Aliases fill **top-down**: first the Location ("nearest unvisited bandit
  dungeon"), then a Reference *in* it, then an item *in* that container. Order =
  dependency.
- The **Story Manager** fires quests by listening to events (entering a location,
  an actor dying).
- The "go to nearest unvisited dungeon" pattern explicitly **steers the player
  toward undiscovered content**.

**Pros/cons**: near-infinite content for a fraction of an authored quest's cost —
but the CK docs admit the system "cannot create large, complicated, or
particularly interesting quests". The cautionary case is **Fallout 4's Preston
Garvey "Another settlement needs your help"** [OBS]: unlimited radiant Minutemen
quests spammed across channels; patch 1.3 fixed *improper repetition* but not the
volume. Without a pacing curve / cap / variety, infinite filler **fatigues**
rather than enriches.

## The Nemesis system (Shadow of Mordor / War)

Documented via WB patents (US 10,926,179 B2 / US 11,660,540 B2) [DOC, patent — a
*claimed* architecture, not necessarily the shipped build]:

- A **faction manager** maintains a hierarchy (Overlord → Warchief → Captain →
  Soldier) with traits (exploitable strengths/weaknesses) and non-hierarchical
  relations (friendships/rivalries).
- NPCs **promote** through the hierarchy, issue death-threats, and the microcosm
  **evolves without player intervention**.
- A pool of aesthetic features is **mixed and reassembled** to give each nemesis a
  unique personality + role; they **remember** player encounters and hold
  personalized grudges (~25 captains/region [OBS]).
- The patent (granted 2021–2022 after repeated refusals) sparked an industry
  controversy over whether it chills adoption of the idea.

The architectural lesson: **persistent procedural antagonists** with memory are a
distinct quest-like content source — links to `enemy-ai-framework`.

## Storyteller vs AI-director pacing (distinguish these)

- **RimWorld AI Storyteller** (Cassandra/Phoebe/Randy) [DOC + community RE]: an
  invisible director that injects incidents (raids, drop pods) on a **long pacing
  curve** — Cassandra 4.6 days On / 6 days Off, 1–2 major threats per On phase;
  Phoebe 8/8 with one threat (breathing room); Randy with no guaranteed cooldown.
  A storyteller paces a **long-run incident budget**.
- **Left 4 Dead AI Director** [DOC, Valve] — **distinct**: it adjusts the
  **pacing (frequency), not the difficulty (amplitude)**. It estimates each
  survivor's short-term emotional intensity, tracks the max of four, and cycles
  Build-Up → Peak → Peak Fade → Relax (30–45 s, no major spawns). A director paces
  the **minute**; a storyteller paces the **season**. Don't conflate them.
- **Crusader Kings 3** [DOC] models "quests" as **data**: events (`trigger` +
  `mean_time_to_happen` + `option` branches), schemes (scoped objects with
  exposed state: power/secrecy/progress), and hooks (social levers). Narration
  emerges from the trait/relation/scope combinatorics, not an authored graph.

## Simulation-driven emergence

The "story generator" pole — quests *emerge* from agent simulation rather than
authored templates:

- **Dwarf Fortress** [DOC, T. Adams]: "We never wanted to write a plot… create
  actors with motivations, and let them go." World-gen is a zero-player strategy
  game with thousands of agents (~50 traits each); history is just the record. The
  admitted cost: needs **post-processing to find the readable moments**; pure
  emergence risks boring output.
- **Caves of Qud** [DOC, GDC + academic papers]: a **two-phase architecture**
  (world-gen abstract representations → zone-gen reification when the player
  enters) that the quest system must follow; pre-authored quest templates + a
  history grammar, "eschewing causal logic in favor of randomness parameterized by
  the narrative world" → outputs ripe for apophenic reading (the player projects
  meaning).
- **STALKER A-Life** [DOC + OBS]: an online/offline simulation (full detail near
  the player; global-graph turn-based resolution offline) where "quests" (save a
  stalker, defend a camp) emerge unscripted. **The cautionary tale**: A-Life
  "never shipped in a proper, unrestricted form" — STALKER 2's "A-Life 2.0"
  simulated almost nothing beyond ~100 m at launch. **The announced architecture ≠
  the shipped behavior** — emergent systems are expensive to make reliable.

## Ambient encounters & the hybrid reality

- **RDR2 ambient encounters** are less procedural than they appear: hand-crafted
  AI routines + state machines + a witness system (a crime must be *perceived* to
  be reported), with authored hooks triggered by systemic state (a camp
  conversation can lead to a bank robbery).
- **Watch Dogs Legion's Census** [DOC, GDC 2021] is the most explicitly procedural
  quest-side: a relational NPC database generates demographically-coherent profiles
  and schedules; a **recruitment mission is generated at runtime**, with the
  generator fixing what/when/where and pulling who/why from the recruit's backstory.
- **The hybrid is the shipped norm**: an **authored backbone + procedural filler**
  (Wildermyth's "Library of Plays" — hand-crafted plot + targeting/scoring of
  events; Qud/Skyrim templates filled procedurally; Legion/RDR2 authored skeleton +
  systemic who/why). Pure procedural sounds hollow because it lacks **dramatic
  causality** (no guaranteed climax, meaning projected not built). The real cost is
  **tuning/QA/tagging** (Census: "procedural generation requires massive tuning")
  and **reliability** (the A-Life failure).

## Comparison

| System | Generated unit | Core mechanism | Persistence | Authored vs procedural |
| --- | --- | --- | --- | --- |
| Skyrim/FO4 Radiant | quest (template) | aliases filled by conditions + Story Manager | low | template + procedural fill |
| Nemesis | antagonist + hierarchy | faction manager, reassembled traits, promotion | **strong** (grudges) | procedural, emergent arcs |
| RimWorld Storyteller | incident | On/Off curve + incident budget | low | procedural (pacing) |
| L4D AI Director | spawn / pacing | 4-player intensity → Build/Peak/Fade/Relax | short-term | procedural (frequency, not difficulty) |
| Dwarf Fortress | history (log) | zero-player multi-agent sim | **very strong** | pure procedural (story generator) |
| Caves of Qud | quest + village | world-gen → zone-gen, templates + grammar | strong | hybrid |
| STALKER A-Life | emergent "quest" | online/offline graph, GOAP | medium | procedural; **shipping ≠ promise** |
| WD Legion Census | NPC + recruit mission | relational DB, coherent profiles | **strong** | procedural who/why + authored missions |

## Flagged gaps — do NOT invent

Nemesis patents are *claimed* architecture, not the shipped build; "25 captains"
is observed · the RimWorld "bins" model is contested community RE · A-Life
marketing often exceeds shipped reality (especially STALKER 2) · RDR2 has no public
architectural dev doc (interviews + observation only).

## Sources

UESP CK (Radiant aliases, Story Manager) · Google Patents US 10,926,179 /
11,660,540 (Nemesis) · RimWorld Wiki (storytellers) · Mike Booth "The AI Systems
of Left 4 Dead" (Valve, 2009) · CK3 Wiki (scripting) · Gamasutra (Tarn Adams, Dwarf
Fortress) · Grinblat/Bucklew GDC 2019 + CEUR papers (Caves of Qud) · Iassenev
Gamasutra (STALKER A-Life) · GDC 2021 "Census: The Systemic Backbone" (Dragert) ·
Austin EPC 2021 (Wildermyth) · Know Your Meme (Fallout 4 settlement spam).
