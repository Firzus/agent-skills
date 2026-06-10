# Architecture — graph, runtime, barks, presentation, pipeline

The components of a production dialogue system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary sources: the GenshinDialog/GenshinTexts datamines, zeldamods
(BFEVFL, MSBT, AISchedule), Valve GDC 2012 (Ruskin), Netflix/BBC/GAG
standards, tool documentation.

## The graph

### Two datamined shapes

- **Genshin — flat nodes, choice as fan-out**: every line is a node
  with `id`, `nextDialogs[]` (the edges), `talkRole` (speaker,
  resolved from NPC config), and two TextMap hashes (line text +
  speaker name). A node fanning out to several player-spoken lines
  *is* the choice menu; each option carries its own `nextDialogs`;
  exit = an option with an empty array. Dialogs group into **Talks**
  (the triggerable unit), filed by context (NPC, gadget, coop,
  activity). One node type covers everything.
- **BotW — five event types**: Action (an actor function call),
  **Switch** (an actor *query* returning an int + a value→next-event
  cases table — this is ALL conditional branching), Fork/Join
  (parallelism), Sub-flow (a callable entry point in another flow =
  functions/reuse). Dialogue text lives in MSBT archives per
  language, partitioned by purpose: `EventFlowMsg` (NPC dialogue),
  `QuestMsg`, `ShoutMsg` (gameplay barks subtitles!), `DemoMsg`
  (cutscenes), `LayoutMsg` (UI).
- **Choices carry typed metadata**: Genshin options bear category
  icons (talk bubble, quest mark, shop purse, reward gift) — model
  the icon/type as choice-node data. Conditional choices can be
  hidden or greyed (decide per choice). Timed choices: neither
  reference game (the Telltale ~5–6 s as the only comparison line) —
  an architecture option, not a reference practice.

### Conditions

Queries on the world-state store: quest state, flags, items, time of
day, weather, first-meeting vs repeat, player state. The BotW proof
that this scales: systemic reactive lines (NPCs comment on rain, on
time, on a naked Link) come from AISchedule variants (`RainEmotion`,
rain anchors per schedule block) plus Switch queries — all data.
Genshin gates at the Talk level (begin conditions on quest state; the
exact obfuscated fields are flagged unverified).

### Text format

Rich-text control tags live **in the text**, not the graph: color
palettes, pauses (named or in frames), page breaks, ruby/furigana
(CJK first-class in MSBT), name insertion, **gender variants inline**
(Genshin's Aether/Lumine sibling lines vary per traveler gender in
every language). BotW goes further: `sound` and `animation` tags
trigger effects **on the speaking NPC from inside the text** — the
typographic and performative pacing is writing data. Budget for this
in the parser from day one.

## The runtime

### The session scope

Entering dialogue mutates N systems — input context, camera
(`camera-system` contract via `DialogueStarted(speaker, listener)` /
`DialogueLineChanged` / `DialogueEnded` events), HUD visibility
(`hud-system`), NPC AI (schedule pause). The session **captures state
on entry and restores it in a finally** on every exit path: normal
end, player death, teleport, save/load, NPC destruction. One session
manager, one active session; concurrent initiations refused or
queued.

Neither reference game pauses the world during dialogue (Genshin's
clock keeps running; only the pause menu freezes in solo). Genshin
locks the player in quest dialogue; in co-op, guests keep running
while the host talks — the session is per-player, not a world state.

### Staging as data (the BotW gold mine)

AISchedule fields make conversational staging actor data:
`MoveTalkTurn`/`WaitTalkTurn` (turn to face), `ReactionToApproach` +
distance (interrupt current activity on approach), greeting types,
rain variants of *every* field, and `ReturnMoveTimeAfterTalk`
(routine resumption delay after the conversation). The runtime reads
staging; designers author it per actor per schedule block.

Look-at: an additive head/eye aim layer — weight ramped over
~0.3–0.5 s (never snapped), angle-clamped (disengage beyond), line-
of-sight checked, distributed along the chain (eyes → head → torso).

### Voice

- **Line ↔ audio by stable ID** (`soundId` per dialog node in the
  datamine). Text-only lines are first-class: the partial-VO model
  is a shipped strategy, not a degenerate case.
- **Two cost strategies, both shipped**: Genshin voices Archon/Story
  quests, not world quests — 4 VO languages (CN/EN/JA/KO) as
  separately downloadable packs (14–18 GB each, +300 MB–1 GB per
  patch per language); BotW voices only key cutscenes with ~13
  characters (Aonuma: VO for "moments of impact" — the stylized
  dodge: grunts + text elsewhere).
- **Voice-end advancing is a parameter, not a hardcode** (Yarn's
  `endLineWhenVoiceoverComplete` + post-line wait): auto mode
  advances on line end and **pauses on choices** (the Genshin v1.2
  behavior).

### Barks

A separate system from sessions. Gameplay **requests** a bark; a
central arbiter **decides**: priority categories (session dialogue >
scripted barks > ambient), per-line and per-category cooldowns, a
played-history for anti-repetition, muting during sessions and
cutscenes, and Playing/Queued/Rejected outcomes.

For context selection at scale, the reference is **Valve GDC 2012
(Ruskin, L4D/TF2/Dota)**: world state as facts, a rule base matched
fuzzily, the most specific rule wins, special cases added without
touching code — plus Naughty Dog's context-aware dialog (TLoU) and
Firewatch's interruptible-conversation system (GDC 2017) as
complements. BotW's data equivalents: approach reactions in
AISchedule and `ShoutMsg` one-shot subtitled gameplay lines.

### Events out

The dialogue notifies; consumers decide. End-of-talk is a quest event
(`QUEST_CONTENT_COMPLETE_TALK`/`FINISH_PLOT` — the `quest-system`
bridge); mid-flow Action events give items, set flags, play
animations. The dialogue system owns none of these outcomes.

## Presentation

- **The dialogue UI**: nameplate + line text (bottom third by
  convention — no normative figure exists), BotW: 3 lines max per
  bubble with manual breaks in the data; Genshin: floating choice
  bubbles with typed icons, up to 6 observed.
- **Typewriter**: tool conventions 20–60 cps (Pixel Crushers default
  50) + an instant option; expose speed in settings. No measured cps
  for either reference game (flagged).
- **Auto mode**: delay = `max(VO duration, text length × configurable
  reading speed) + margin`; reading anchors: adults ~238 wpm silent,
  broadcast subtitles 160–180 wpm, Netflix 20 cps / 42 chars / 2
  lines / 5/6–7 s per event.
- **Skip — the verified chronology** (the cautionary tale): Genshin
  shipped hangout-repeat skip only (4.5), Quick Start (5.0 —
  *prerequisite* skip, not dialogue), a time-skip QoL (5.8), Focused
  Experience Mode (Luna I) — and still **no general dialogue skip**
  after years of documented demand (third-party auto-skip scripts
  exist). HSR 3.4's **skip-with-summary** is the model to copy. The
  rule: skip is a first-class feature; world events triggered by
  dialogue must execute even when skipped.
- **Backlog**: the Travel Log model (v1.2) — full transcript + audio
  replay of completed story quests, including choice branches —
  plus an in-session scrollable history (the community complaint
  Genshin never fixed).
- **Accessibility**: subtitle size 46 px @1080p recommended (32 px
  default scalable — Xbox/AGI); 2 lines × ~40 chars; ≥1 s per line,
  ≥2.5 s per full subtitle; speaker indication; both reference games
  ship **no text size options** — a gap to beat, not a precedent to
  follow.

## Authoring, localization, VO pipeline

- **Writer tools** (pick by team): Ink — text-first prose flow with
  inline choices and quick reconvergence, no visual editor; Yarn
  Spinner — node-script hybrid with screenplay syntax, built-in
  line-ID localization and VO workflow; articy:draft — a visual
  narrative database for large multi-team productions. At Genshin
  scale the data lives in spreadsheet-born configs
  (`DialogExcelConfigData` — the name says it). Whatever the tool:
  **automated import to runtime with validation on every sync**.
- **The VO pipeline**: line ID → recording script (with
  director-context fields — UE's `VoiceActorDirection` shows the
  shape) → audio files named by line ID → integration + lip-sync
  data. **Text-lock before recording**; separate spoken-text vs
  subtitle fields for deliberate divergence; pickup-session tracking
  per script version. Costs: SAG-AFTRA $551/h (1 voice) / $1,102/4 h
  (up to 3 voices), +15% under the 2025 agreement.
- **Lip-sync tiers**: mouth flaps (rhythmic open/close — the
  observed Genshin standard-dialogue level, unverified technically)
  → auto visemes (phoneme→viseme→blendshapes, ~15 shapes:
  OVRLipSync 15, Rhubarb 6–9, sets 12–22; Hogwarts Legacy shipped
  50k lines × 8 languages with audio-driven auto lip-sync) → facial
  capture for cutscenes. Mix tiers by content importance.
- **Localization**: 15 text languages (Genshin, with IT/TR added in
  4.x) vs 4 voice — text scales, voice doesn't. Expansion budgets:
  DE +10–35%, FR +15–25%, FI up to +60%, short strings +100–200%;
  CJK contracts. **Pseudo-localization in dev** (inflated accented
  text detects overflow, hardcoded strings, concatenation).
  Plural/gender in the format (FText `|plural()`/`|gender()`;
  Unity Smart Strings — with the Yarn `{}` conflict caveat).
  Throughput: ~2,000–2,500 words/day/translator.
- **Versioning is additive by construction**: stable hashes/IDs mean
  each patch adds TextMap entries (~14,850/version measured) and
  dialog nodes without touching existing ones; a text fix is a hash
  entry replacement, never a graph change.

## Flagged gaps — do NOT invent

The ">10M words" official claim (unsourced — use the 170k-line
datamine) · measured reveal speed (cps) in either game · Genshin
auto-mode delay rules (the "75% listen" figure is unsourced) · choice
text length limits · dialogue box dimensions as % of screen ·
timed choices in the reference games (none found) · letterboxing and
emoji reactions in Genshin dialogue · Genshin mouth-flap tech (visual
observation only) · BotW total MSBT message count (jpdb's 302k JP
words is the proxy) · the "~450 NPCs" figure (231–413 by criteria) ·
TalkExcelConfigData begin-condition fields (obfuscated) ·
lines-per-recording-session heuristics.

## Sources

GenshinDialog / GenshinTexts / genshin-voice datamines · Grasscutter
(quest-talk conditions) · zeldamods (BFEVFL, Message archives, Text
modding/MSBT tags, AISchedule) · Valve GDC 2012 (Ruskin — dynamic
dialog) · Naughty Dog GDC (context-aware dialog) · Firewatch GDC 2017
· Polygon (Aonuma VO interview) · Netflix Timed Text Style Guide ·
BBC Subtitle Guidelines · Game Accessibility Guidelines / Xbox ·
Brysbaert 2019 (reading rates) · SAG-AFTRA interactive rates · Meta
OVRLipSync / Rhubarb docs · Speech Graphics (Hogwarts Legacy) ·
localization industry tables (Laoret, W3C) · Yarn Spinner / Ink /
Pixel Crushers / Narrative Pro / Mountea documentation.
