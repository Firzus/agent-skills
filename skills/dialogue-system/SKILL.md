---
name: dialogue-system
description: >-
  Architecture blueprint for dialogue systems in open-world games: the
  dialogue graph data model (line nodes, choice fan-out, condition gates,
  text as localization keys, rich-text control tags), the runtime session
  (input/camera/HUD scope, in-world staging as data, voice-end advancing,
  interruption policies), barks/ambient dialogue (priority, cooldowns,
  the Valve fact-matching model), presentation (typewriter reveal,
  auto/skip modes, backlog), and the authoring/VO/localization pipeline
  (writer tools, line IDs, partial-VO strategies, lip-sync, text
  expansion budgets). References: BotW/TotK (datamined EventFlow/MSBT)
  and Genshin Impact (datamined Dialog/Talk configs), with Valve GDC 2012
  for barks. Use when designing or building NPC conversations, dialogue
  trees, barks, subtitles, VO pipelines, or when players get stuck in
  dialogue mode, text overflows in German, or NPCs freeze mid-routine.
---

# Dialogue System

Build the dialogue layer of an open-world game — graph, runtime,
presentation, and the authoring/VO pipeline. In-world dialogue focus:
cutscenes are out of scope (`cinematic-system`); procedural dialogue
cameras live in `camera-system`. References: BotW/TotK (datamined
EventFlow + MSBT) and Genshin Impact (datamined Dialog/Talk configs).

## The architecture rule

**Flow, text, and conditions are three separate stores — the graph
never contains text, only references.** Both reference games ship this
separation, and it is the foundation of localization, VO, and
versioning.

```
GRAPH (flow only)
  Genshin shape: ONE node type — a line with nextDialogs[] edges;
  a choice is just fan-out to player-spoken lines (talkRole);
  the close-menu option is a node with empty nextDialogs
  BotW shape: 5 event types suffice — Action / Switch (an actor
  query returning int + a cases table = ALL conditional branching) /
  Fork / Join / Sub-flow (reusable sub-graphs)
  grouping: Talks (triggerable containers of dialog nodes), bound to
  NPCs and to quest steps

TEXT (per-language tables, addressed by stable key)
  Genshin: TextMap hash per language; BotW: MSBT labels per language
  rich-text CONTROL TAGS live in the text: color, pauses (frames),
  ruby/furigana (CJK first-class), name insertion, gender variants —
  and in BotW, sounds and NPC ANIMATIONS triggered from the text
  (typographic pacing is writing data, not code)

CONDITIONS (queries on world state)
  speaker schedule state, quest state, flags, time/weather, player
  state — BotW's systemic reactive lines (rain, naked Link) come from
  AISchedule variants + Switch queries, all data

EVENTS OUT
  dialogue notifies; consumers decide: end-of-talk is a quest event
  (QUEST_CONTENT_COMPLETE_TALK — the quest-system bridge), give-item/
  set-flag are Action events in the flow
```

## The session and the barks

- **A dialogue session is a scope**: capture input context, camera,
  HUD, and NPC AI state on entry — restore in a `finally` on EVERY
  exit path (normal, death, teleport, load). The stuck-in-dialogue
  bug class is a missing finally.
- **Staging is actor data, not code** (the BotW lesson): turn-to-face
  (`MoveTalkTurn`), approach reactions + distances, per-schedule rain
  variants, and post-dialogue routine resumption
  (`ReturnMoveTimeAfterTalk`) all live in AISchedule. Look-at IK is a
  ramped weight (~0.3–0.5 s), angle-clamped, vision-checked.
- **One session manager**: a single active session; concurrent
  requests refused or queued. Interruption policy is a per-category
  matrix decided in design: ambient bark (silently interruptible) /
  optional conversation (pause-resume or fade with a break line) /
  critical dialogue (player locked — the BotW stance).
- **Barks are a separate system**: gameplay *requests*, a central
  arbiter *decides* (priority, per-line and per-category cooldowns,
  history, muted during sessions). The reference is Valve's GDC 2012
  fact-matching model: world state as facts, fuzzy rule matching,
  most-specific-rule-wins, anti-repetition memory — context selection
  as a rule base, not graph branches.
- **The VO strategy is a cost decision made early**: Genshin voices
  Archon/Story quests only (world quests unvoiced; 4 VO languages as
  separately downloadable packs); BotW voices cutscenes only (~13
  characters — the stylized dodge, a documented design decision).
  Per-line `soundId` keys either way.

## Build order (4 shippable tiers)

```
Tier 1 — Graph and session
- [ ] Line nodes + nextDialogs edges + choice fan-out; text as keys
      from day one; Talk containers bound to NPCs
- [ ] The session scope (input/camera/HUD/NPC capture + finally
      restore); contracts: DialogueStarted/LineChanged/Ended events
      (camera-system, hud-system consume)
- [ ] Typewriter reveal + advance input; line-by-line skip
- [ ] Graph validation at import: every node reaches a terminal,
      every choice group has an unconditional option or fallback
Tier 2 — Conditions, staging, voice
- [ ] Condition gates (quest state, flags, time/weather, first-meet
      vs repeat) via the world-state store
- [ ] Staging data: turn-to-face, look-at weight ramp, approach
      reactions, routine resumption
- [ ] VO playback by line ID; voice-end advance as an OPT-IN
      parameter; partial-VO support (text-only lines first-class)
- [ ] Dialogue events out: end-of-talk -> quest-system; mid-line
      actions (give item, set flag, animation cues from text tags)
Tier 3 — Presentation polish
- [ ] Auto mode: delay = max(VO length, text length x configurable
      reading speed) + margin; pauses on choices
- [ ] Choice UI: dead-window on appearance (~0.2-0.3 s), advance and
      select as separate inputs, confirmation for consequential
      choices, typed choice icons
- [ ] Backlog (the Travel Log model: full replay with audio and
      branches) + in-session history
- [ ] Subtitle accessibility: 46 px @1080p target, 2 lines x ~40
      chars, speaker indication, size options
Tier 4 — Pipeline and scale
- [ ] Writer tool -> runtime import automated, with validation on
      every sync (Ink text-first / Yarn node-script / articy visual
      DB — pick by team)
- [ ] VO pipeline: text-lock before recording, files named by line
      ID, spoken-text vs subtitle fields, pickup tracking
- [ ] Localization: pseudo-loc in dev, +30-40% expansion budgets,
      plural/gender forms in the format, CJK ruby support
- [ ] VO memory discipline: streamed, per-language packs, on-demand
      loading; lip-sync tier decision (flaps / auto-visemes / facial)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Corpus scale | Genshin v4.5 datamine: 170,202 lines, 2,422 speakers, ~27 turns/dialogue; ~14,850 TextMap entries added per version; 424,011 VO files (4 languages, 14-18 GB each); BotW: 302k words JP (74% NPC interactions), ~13 voiced characters | datamine |
| Reveal speed | tool conventions 20-60 cps (Pixel Crushers default 50) + instant option; no measured value for either reference game (flagged) | docs |
| Reading rates | adult silent ~238 wpm; broadcast subtitles 160-180 wpm; Netflix: 42 chars/line, 2 lines, 20 cps, 5/6 s-7 s per event | academic/official |
| Subtitle size | 46 px @1080p recommended; 32 px default scalable to 46 (Xbox/AGI); both reference games ship NO size options (the gap to beat) | standards |
| Dialogue box | BotW: 3 lines max per bubble, manual breaks in the data; Genshin choices: up to 6 observed | datamine/community |
| Auto mode | advances on line end (voice/animation), pauses on choices (Genshin v1.2) — exact delays undocumented | wiki |
| Skip reality | Genshin still has NO general dialogue skip (4.5: hangout repeats only; 5.0 Quick Start = prerequisite skip; 5.8 = time skip); HSR 3.4 shipped skip-with-summary — the model to copy | verified chronology |
| VO costs | SAG-AFTRA: $551/h (1 voice), $1,102/4 h (3 voices); audio: mono 48 kHz, Vorbis −70/80%, Opus transparent at 24-32 kbps (~4 KB/s) | official |
| Lip-sync | OVRLipSync 15 visemes; Rhubarb 6-9 mouth shapes; viseme sets 12-22 | tool docs |
| Localization | DE +10-35%, FR +15-25%, short strings up to +200%; ~2,000-2,500 words/day/translator | industry tables |

Flagged — never invent: the ">10M words" claim (no official source —
use the line-count datamine), measured cps in either game, Genshin
auto-mode delays, choice text limits, timed choices (neither game; the
Telltale ~5-6 s as the only comparison). Full tables in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Middleware | Yarn Spinner 3.x (line IDs, Unity Localization bridge via paired String+Asset Tables, `VoiceOverPresenter` with opt-in voice-end advance) · Ink (logic only — wrap `Story`, build UI/VO around) · Dialogue System for Unity (MVC: database asset + Lua state + Sequencer + BarkController; shipped in Disco Elysium) | Dialogue Voice/Wave: present, NOT deprecated, but semi-abandoned (UE4-era docs, 5.4→5.5 gather bug) — usable for subtitle/VO context; Narrative Pro (nodal editor, per-node staging) · Mountea (free, graph validation built in) · custom DataAsset graphs + UMG |
| Typewriter | TMP `maxVisibleCharacters` (rich-text safe, zero GC); UITK: `TextElement.PostProcessTextVertices` (6000.2+) closes the per-glyph gap | UMG rich text + custom reveal; built-in subtitle system works (Project Settings) but is minimal — AAA replaces it |
| Text/loc | Localization package: same line ID indexes the String Table (text) AND Asset Table (VO clip); caveat: Smart Strings conflict with Yarn `{}` interpolation | `FText` + String Tables; native `|plural()` and `|gender()` forms (CLDR data, Epic's own formatter — NOT ICU MessageFormat) |
| VO audio | Vorbis + Streaming + Load In Background, no preload; Addressables per language; ~200 KB overhead per streamed clip (arbitrate for short barks) | Sound Waves + Sound Concurrency (MetaSounds is overkill for VO); ducking: Audio Bus + Submix Dynamics side-chain (modern) vs passive Sound Mix (legacy, deprecation-marked) |
| Look-at | Animation Rigging Multi-Aim (constraint on a sibling transform, never the bone) + scripted weight ramp | Control Rig aim / AnimBP Look At node, blended weight |
| Lip-sync | uLipSync (free, MFCC+Burst, runtime or baked) · SALSA (the store standard) · OVRLipSync (legacy, unmaintained ~2021) · Rhubarb (offline batch) | MetaHuman Animator audio-to-face: offline (5.5+) and editor Live Link (5.6+), **no official in-game runtime** (Epic-confirmed); OVRLipSync same legacy status |

## Failure modes

The 14 classic dialogue bugs (text in logic, the unskippable dialogue,
session state leaks, voice/text desync, bark spam, look-at uncanny
valley, choice misclicks, the frozen NPC, localization overflow, VO
memory blowout, dead-end conversations, interruption chaos,
auto-advance racing the reader, the 100-condition node) are cataloged
in [pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `quest-system` — end-of-talk as a quest event; the shared-NPC lock;
  priority quests.
- `cinematic-system` — cutscenes host the facial/lip-sync production
  built here; the session-scope (finally-restore) discipline is shared.
- `camera-system` — the dialogue camera consumes session events
  (180° rule, procedural framing live there).
- `hud-system` — HUD hiding during sessions; subtitle rendering.
- `enemy-ai-framework` — NPC schedules, approach reactions, the
  dialogue lock on AI state.
- `world-time-weather` — time/weather condition gates on lines.
- `save-persistence` — dialogue-seen flags, first-meet state.
